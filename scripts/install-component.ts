import { ensureDir, copy } from "https://deno.land/std/fs/mod.ts";
import { join } from "https://deno.land/std/path/mod.ts";

async function installComponent(componentName: string) {
  let tempDir: string | undefined;

  try {
    console.log("🔍 Verificando ambiente...");
    const currentDir = Deno.cwd();

    // Define os caminhos
    const componentsDir = join(currentDir, "src", "components");
    const componentDir = join(componentsDir, componentName);

    console.log("📁 Verificando estrutura de pastas...");
    // Cria a estrutura de pastas se não existir
    await ensureDir(componentDir);

    // Cria diretório temporário
    console.log("📦 Preparando para baixar o componente...");
    tempDir = await Deno.makeTempDir();

    console.log("🔍 Clonando repositório...");
    const cloneProcess = Deno.run({
      cmd: [
        "git",
        "clone",
        "--depth", "1",
        "--filter=blob:none",
        "--sparse",
        "git@github.com:deco-sites/components.git",
        tempDir,
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const cloneStatus = await cloneProcess.status();
    const cloneOutput = await cloneProcess.output();
    cloneProcess.close();
    if (!cloneStatus.success) {
      const decoder = new TextDecoder();
      throw new Error(`Falha ao clonar repositório:\n${decoder.decode(cloneOutput)}`);
    }

    console.log("🔍 Localizando componente...");
    const sparseProcess = Deno.run({
      cmd: [
        "git",
        "-C",
        tempDir,
        "sparse-checkout",
        "set",
        `components/${componentName}`,
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const sparseStatus = await sparseProcess.status();
    const sparseOutput = await sparseProcess.output();
    sparseProcess.close();
    if (!sparseStatus.success) {
      const decoder = new TextDecoder();
      throw new Error(`Componente não encontrado:\n${decoder.decode(sparseOutput)}`);
    }

    // Verifica se o componente existe no repositório
    const sourceDir = join(tempDir, "components", componentName);
    try {
      await Deno.stat(sourceDir);
    } catch {
      throw new Error(`Componente '${componentName}' não encontrado no repositório`);
    }

    console.log("📋 Copiando arquivos...");
    // Copia os arquivos
    await copy(sourceDir, componentDir, { overwrite: true });

    console.log(`✅ Componente instalado com sucesso em:\n${componentDir}`);

  } catch (error) {
    console.error("\n❌ Erro durante a instalação:");
    console.error("----------------------------");
    console.error(error.message);
    console.error("----------------------------");
    console.error("\n💡 Dicas:");
    console.error("1. Verifique se está no diretório correto do projeto");
    console.error("2. Certifique-se de que tem permissões para criar pastas e arquivos");
    console.error("3. Verifique se tem acesso ao repositório");
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
  const componentName = Deno.args[0];

  if (!componentName) {
    console.error("\n❌ Erro: Nome do componente é obrigatório");
    console.error("\n📘 Uso:");
    console.error("deno run --allow-run --allow-read --allow-write --allow-net scripts/install-component.ts <nome-do-componente>");
    console.error("\n📝 Exemplo:");
    console.error("deno run --allow-run --allow-read --allow-write --allow-net scripts/install-component.ts MultiSliderRange");
    Deno.exit(1);
  }

  await installComponent(componentName);
}
