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

    const repoUrl = "git@github.com:deco-sites/components.git";

    console.log("🔍 Clonando repositório...");
    const cloneProcess = Deno.run({
      cmd: ["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse", repoUrl, tempDir],
      stdout: "piped",
      stderr: "piped",
    });

    const cloneStatus = await cloneProcess.status();
    cloneProcess.close();
    if (!cloneStatus.success) throw new Error("Falha ao clonar repositório.");

    console.log("🔍 Buscando componentes correspondentes...");
    const sparseListProcess = Deno.run({
      cmd: ["git", "-C", tempDir, "sparse-checkout", "list"],
      stdout: "piped",
    });
    
    const sparseListOutput = new TextDecoder().decode(await sparseListProcess.output());
    sparseListProcess.close();
    
    const componentPaths = sparseListOutput
      .split("\n")
      .filter(path => path.includes(`components/${componentPrefix}`) && path.endsWith(".tsx"));
    
    if (componentPaths.length === 0) {
      throw new Error(`Nenhum componente encontrado com o prefixo '${componentPrefix}'`);
    }

    const componentOptions = componentPaths.map(path => path.replace("components/", "").replace(".tsx", ""));
    let selectedComponent: string;

    if (componentOptions.length > 1) {
      console.log("Múltiplas correspondências encontradas:");
      componentOptions.forEach((name, index) => console.log(`${index + 1}. ${name}`));

      const input = prompt("Escolha o número do componente desejado:");
      const index = parseInt(input || "") - 1;

      if (isNaN(index) || index < 0 || index >= componentOptions.length) {
        throw new Error("Escolha inválida");
      }
      selectedComponent = componentOptions[index];
    } else {
      selectedComponent = componentOptions[0];
    }

    console.log(`🔍 Selecionado: ${selectedComponent}`);
    const sparseSetProcess = Deno.run({
      cmd: ["git", "-C", tempDir, "sparse-checkout", "set", `components/${selectedComponent}`],
      stdout: "piped",
      stderr: "piped",
    });
    
    const sparseSetStatus = await sparseSetProcess.status();
    sparseSetProcess.close();
    if (!sparseSetStatus.success) throw new Error("Falha ao configurar sparse-checkout.");

    const sourceDir = join(tempDir, "components", selectedComponent);
    await Deno.stat(sourceDir);

    console.log("📋 Copiando arquivos...");
    for await (const entry of walk(sourceDir, { exts: [".tsx"], includeFiles: true })) {
      const destinationPath = join(componentsDir, selectedComponent, entry.path.replace(sourceDir, ""));
      await ensureDir(join(destinationPath, ".."));
      await copy(entry.path, destinationPath, { overwrite: true });
    }

    console.log(`✅ Componente '${selectedComponent}' instalado com sucesso em:\n${join(componentsDir, selectedComponent)}`);

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
    console.error("deno run --allow-run --allow-read --allow-write --allow-net scripts/install-component.ts <prefixo-do-componente>");
    Deno.exit(1);
  }

  await installComponent(componentPrefix);
}
