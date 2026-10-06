import hashlib
import importlib.util
import json
import builtins
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path

PIPELINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE))

from identidade_documental import (  # noqa: E402
    IdentidadeDocumentalErro, resolver_fonte_existente, selecionar_manifesto,
    validar_arquivo_bruto,
)

SHA = "e902047328adfa21ca523121684dd657ded74e28015199e2df59950cba0758a4"
META = {
    "titulo": "Dossiê", "autor_orgao": "Familiares; IEVE", "tipo_fonte": "compilacao_documental",
    "confiabilidade": "alta", "data_documento": None, "periodo": "pos_1985",
    "url_origem": "https://exemplo.test/livro.pdf", "licenca": None,
    "nota_contexto": "Compilação documental.", "proveniencia": f"sha256 {SHA}",
}


class Resposta:
    def __init__(self, data): self.data = data


class Consulta:
    def __init__(self, dados): self.dados, self.campo, self.valor = dados, None, None
    def select(self, _): return self
    def eq(self, campo, valor): self.campo, self.valor = campo, valor; return self
    def execute(self): return Resposta([d for d in self.dados if d.get(self.campo) == self.valor])


class SupabaseFalso:
    def __init__(self, dados): self.dados = dados
    def table(self, nome): return Consulta(self.dados)


class TabelaExecucao:
    def __init__(self, banco, nome):
        self.banco, self.nome, self.campo, self.valor = banco, nome, None, None

    def select(self, _): return self
    def eq(self, campo, valor): self.campo, self.valor = campo, valor; return self
    def execute(self):
        if self.nome == "fontes":
            return Resposta([d for d in self.banco.fontes if d.get(self.campo) == self.valor])
        return Resposta([])

    def insert(self, _):
        self.banco.escritas.append((self.nome, "insert"))
        return self

    def delete(self):
        self.banco.escritas.append((self.nome, "delete"))
        return self


class BancoExecucao:
    def __init__(self, fontes): self.fontes, self.escritas = fontes, []
    def table(self, nome): return TabelaExecucao(self, nome)


def carregar_indexador():
    spec = importlib.util.spec_from_file_location("indexador_teste", PIPELINE / "04_indexar.py")
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


class IdentidadeDocumentalTest(unittest.TestCase):
    def registro(self, fonte_id="fonte-correta"):
        return dict(META, fonte_id=fonte_id)

    def test_pin_resolve_registro_correto_apesar_de_url_duplicada(self):
        errado = self.registro("registro-vazio")
        errado["titulo"] = "Outro documento"
        achada = resolver_fonte_existente(SupabaseFalso([errado, self.registro()]), META, "fonte-correta", SHA)
        self.assertEqual(achada["fonte_id"], "fonte-correta")

    def test_pin_inexistente_ou_divergente_rejeita_sem_fallback(self):
        with self.assertRaisesRegex(IdentidadeDocumentalErro, "não existe"):
            resolver_fonte_existente(SupabaseFalso([self.registro()]), META, "id-ausente", SHA)
        com_erro = self.registro()
        com_erro["titulo"] = "Título incorreto"
        with self.assertRaisesRegex(IdentidadeDocumentalErro, "titulo"):
            resolver_fonte_existente(SupabaseFalso([com_erro]), META, "fonte-correta", SHA)

    def test_sem_pin_ambiguidade_por_url_interrompe(self):
        with self.assertRaisesRegex(IdentidadeDocumentalErro, "mais de um"):
            resolver_fonte_existente(SupabaseFalso([self.registro("a"), self.registro("b")]), META, None, SHA)

    def test_manifesto_exige_slug_url_e_hash_do_arquivo(self):
        conteudo = b"arquivo documental"
        sha = hashlib.sha256(conteudo).hexdigest()
        manifesto = [{"slug": "dossie", "url_original": META["url_origem"], "arquivo_local": "dados/brutos/teste.pdf", "sha256": sha}]
        entrada = selecionar_manifesto(manifesto, "dossie", META["url_origem"])
        with tempfile.TemporaryDirectory() as temporario:
            raiz = Path(temporario)
            alvo = raiz / "dados/brutos/teste.pdf"
            alvo.parent.mkdir(parents=True)
            alvo.write_bytes(b"arquivo alterado")
            with self.assertRaisesRegex(IdentidadeDocumentalErro, "diverge do manifesto"):
                validar_arquivo_bruto(entrada, raiz, sha)
            alvo.write_bytes(conteudo)
            with self.assertRaisesRegex(IdentidadeDocumentalErro, "sha256_esperado"):
                validar_arquivo_bruto(entrada, raiz, "0" * 64)
        with self.assertRaisesRegex(IdentidadeDocumentalErro, "exatamente uma"):
            selecionar_manifesto(manifesto, "outro-slug", META["url_origem"])

    def _executar_main_com_fixtures(self, argumentos, vetor, bloquear_modelo=False):
        """Executa main com fixtures locais e módulos de infraestrutura falsos."""
        indexador = carregar_indexador()
        conteudo_pdf = b"pdf de teste"
        sha = hashlib.sha256(conteudo_pdf).hexdigest()
        meta = dict(META, url_origem="https://exemplo.test/livro.pdf", proveniencia=f"sha256 {sha}")
        fonte = dict(meta, fonte_id="fonte-correta")
        banco = BancoExecucao([fonte])
        with tempfile.TemporaryDirectory() as temporario:
            raiz = Path(temporario)
            bruto = raiz / "dados/brutos/dossie.pdf"
            bruto.parent.mkdir(parents=True)
            bruto.write_bytes(conteudo_pdf)
            (raiz / "dados/chunks").mkdir(parents=True)
            (raiz / "dados/chunks/dossie.jsonl").write_text(
                json.dumps({"ordem": 1, "conteudo": "trecho", "paginas": "1", "secao": "A"}) + "\n",
                encoding="utf-8",
            )
            catalogo = raiz / "fontes.json"
            catalogo.write_text(json.dumps({"dossie": {"fonte": meta, "fonte_id_existente": "fonte-correta", "sha256_esperado": sha}}), encoding="utf-8")
            manifesto = raiz / "manifesto.json"
            manifesto.write_text(json.dumps([{"slug": "dossie", "url_original": meta["url_origem"], "arquivo_local": "dados/brutos/dossie.pdf", "sha256": sha}]), encoding="utf-8")
            anteriores = (indexador.RAIZ, indexador.CATALOGO, indexador.ARQ_MANIFESTO, sys.argv[:])
            modulos_anteriores = {nome: sys.modules.get(nome) for nome in ("dotenv", "supabase", "sentence_transformers")}
            ambiente_anterior = {nome: os.environ.get(nome) for nome in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")}
            importar_original = builtins.__import__
            try:
                indexador.RAIZ, indexador.CATALOGO, indexador.ARQ_MANIFESTO = raiz, catalogo, manifesto
                sys.argv = ["04_indexar.py", "dossie", *argumentos]
                sys.modules["dotenv"] = types.SimpleNamespace(load_dotenv=lambda _: None)
                sys.modules["supabase"] = types.SimpleNamespace(create_client=lambda *_: banco)
                sys.modules["sentence_transformers"] = types.SimpleNamespace(
                    SentenceTransformer=lambda _: types.SimpleNamespace(encode=lambda *_, **__: vetor)
                )
                os.environ["SUPABASE_URL"] = "https://supabase.test"
                os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "chave-de-teste"
                if bloquear_modelo:
                    def bloquear_importacao(nome, *args, **kwargs):
                        if nome == "sentence_transformers":
                            raise AssertionError("O modo diagnóstico não pode importar o modelo.")
                        return importar_original(nome, *args, **kwargs)
                    builtins.__import__ = bloquear_importacao
                yield indexador, banco
            finally:
                builtins.__import__ = importar_original
                indexador.RAIZ, indexador.CATALOGO, indexador.ARQ_MANIFESTO, sys.argv = anteriores
                for nome, valor in ambiente_anterior.items():
                    if valor is None:
                        os.environ.pop(nome, None)
                    else:
                        os.environ[nome] = valor
                for nome, modulo in modulos_anteriores.items():
                    if modulo is None:
                        sys.modules.pop(nome, None)
                    else:
                        sys.modules[nome] = modulo

    def test_main_padrao_nao_escreve_nem_carrega_modelo(self):
        gerador = self._executar_main_com_fixtures([], [], bloquear_modelo=True)
        indexador, banco = next(gerador)
        try:
            indexador.main()
            self.assertEqual(banco.escritas, [])
        finally:
            with self.assertRaises(StopIteration): next(gerador)

    def test_aplicar_existente_sem_chave_designa_nao_escreve_nem_carrega_modelo(self):
        gerador = self._executar_main_com_fixtures(["--aplicar"], [], bloquear_modelo=True)
        indexador, banco = next(gerador)
        try:
            with self.assertRaisesRegex(SystemExit, "substituir-chunks"):
                indexador.main()
            self.assertEqual(banco.escritas, [])
        finally:
            with self.assertRaises(StopIteration): next(gerador)

    def test_embedding_invalido_interrompe_antes_de_apagar_chunks(self):
        class VetorInvalido:
            def tolist(self): return [0.0]

        gerador = self._executar_main_com_fixtures(["--aplicar", "--substituir-chunks"], [VetorInvalido()])
        indexador, banco = next(gerador)
        try:
            with self.assertRaisesRegex(IdentidadeDocumentalErro, "384 dimensões"):
                indexador.main()
            self.assertEqual(banco.escritas, [])
        finally:
            with self.assertRaises(StopIteration): next(gerador)


if __name__ == "__main__":
    unittest.main()
