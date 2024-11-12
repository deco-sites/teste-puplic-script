import { ensureDir, copy, walk } from "https://deno.land/std/fs/mod.ts";
import { join } from "https://deno.land/std/path/mod.ts";

async function installComponent(componentPrefix: string) {
  let tempDir: string | undefined;

  try {
    console.log("🔍 Verificando ambiente...");
    const currentDir = Deno.cwd();
    const componentsDir = join(currentDir, "src", "components");

    console.log("📁 Verificando estrutura de pastas...");
    await ensureDir(componentsDir);

    console.log("📦 Preparando para baixar o componente...");
    tempDir = await Deno.makeTempDir();

    const repoUrl = "https://github.com/deco-sites/components.git";

    console.log("🔍 Clonando repositório...");
    const cloneProcess = Deno.run({
      cmd: ["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse", repoUrl, tempDir],
      stdout: "piped",
      stderr: "piped",
    });
    const cloneOutput = await cloneProcess.output();
    const cloneError = await cloneProcess.stderrOutput();
    const cloneStatus = await cloneProcess.status();
    cloneProcess.close();
    
    console.log(new TextDecoder().decode(cloneOutput));
    console.error(new TextDecoder().decode(cloneError));

    if (!cloneStatus.success) throw new Error("Falha ao clonar repositório.");

    console.log("🔍 Buscando componentes correspondentes...");
    const sparseSetProcess = Deno.run({
      cmd: ["git", "-C", tempDir, "sparse-checkout", "set", `components/${componentPrefix}`],
      stdout: "piped",
      stderr: "piped",
    });
    const sparseSetOutput = await sparseSetProcess.output();
    const sparseSetError = await sparseSetProcess.stderrOutput();
    const sparseSetStatus = await sparseSetProcess.status();
    sparseSetProcess.close();

    console.log(new TextDecoder().decode(sparseSetOutput));
    console.error(new TextDecoder().decode(sparseSetError));

    if (!sparseSetStatus.success) {
      throw new Error(`Componente '${componentPrefix}' não encontrado ou falha ao configurar sparse-checkout.`);
    }

    const sourceDir = join(tempDir, "components", componentPrefix);
    try {
      await Deno.stat(sourceDir);
    } catch {
      throw new Error(`Componente '${componentPrefix}' não encontrado no repositório.`);
    }

    console.log("📋 Copiando arquivos...");
    for await (const entry of walk(sourceDir, { exts: [".tsx"], includeFiles: true })) {
      const destinationPath = join(componentsDir, componentPrefix, entry.path.replace(sourceDir, ""));
      await ensureDir(join(destinationPath, ".."));
      await copy(entry.path, destinationPath, { overwrite: true });
    }

    console.log(`✅ Componente '${componentPrefix}' instalado com sucesso em:\n${join(componentsDir, componentPrefix)}`);

  } catch (error) {
    console.error("\n❌ Erro durante a instalação:");
    console.error(error.message);
    Deno.exit(1);
  } finally {
    if (tempDir) {
      console.log("\n🧹 Limpando arquivos temporários...");
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch {
        console.warn("⚠️  Não foi possível limpar alguns arquivos temporários");
      }
    }
  }
}

if (import.meta.main) {
  const componentPrefix = Deno.args[0];

  if (!componentPrefix) {
    console.error("\n❌ Erro: Prefixo do componente é obrigatório");
    console.error("\n📘 Uso:");
    console.error("deno run --allow-run --allow-read --allow-write --allow-net https://raw.githubusercontent.com/deco-sites/teste-puplic-script/main/scripts/install-component.ts <prefixo-do-componente>");
    Deno.exit(1);
  }

  await installComponent(componentPrefix);
}
