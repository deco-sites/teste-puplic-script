import { ensureDir } from "https://deno.land/std/fs/mod.ts";

async function downloadAndCopyComponent(componentName: string) {
  try {
    const currentDir = Deno.cwd();
    const tempDir = await Deno.makeTempDir();
    const targetPath = `${currentDir}/src/components/${componentName}`;

    console.log("📦 Baixando componente...");

    // Clona apenas a pasta específica do componente
    const cloneProcess = new Deno.Command("git", {
      args: [
        "clone",
        "--depth", "1",
        "--filter=blob:none",
        "--sparse",
        "git@github.com:deco-sites/components.git",  // Repositório privado
        tempDir
      ],
    });

    const cloneOutput = await cloneProcess.output();
    if (!cloneOutput.success) {
      throw new Error("Falha ao clonar repositório");
    }

    console.log("🔍 Localizando componente...");

    // Configura sparse-checkout para pegar apenas a pasta do componente
    const sparseProcess = new Deno.Command("git", {
      args: [
        "-C",
        tempDir,
        "sparse-checkout",
        "set",
        `components/${componentName}`
      ],
    });

    const sparseOutput = await sparseProcess.output();
    if (!sparseOutput.success) {
      throw new Error("Componente não encontrado");
    }

    console.log("📋 Copiando arquivos...");

    // Cria toda a estrutura de diretórios necessária
    await ensureDir(`${currentDir}/src/components/${componentName}`);

    // Verifica se o componente existe no diretório temporário
    const sourceDir = `${tempDir}/components/${componentName}`;
    try {
      await Deno.stat(sourceDir);
    } catch {
      throw new Error(`Componente '${componentName}' não encontrado no repositório`);
    }

    // Copia os arquivos
    const copyProcess = new Deno.Command("cp", {
      args: [
        "-r",
        sourceDir,
        `${currentDir}/src/components/`
      ],
    });

    const copyOutput = await copyProcess.output();
    if (!copyOutput.success) {
      throw new Error("Falha ao copiar arquivos");
    }

    // Limpa diretório temporário
    await Deno.remove(tempDir, { recursive: true });

    console.log(`✅ Componente '${componentName}' instalado com sucesso em ${targetPath}`);
  } catch (error) {
    console.error(`❌ Erro:`, error.message);
    // Limpa diretório temporário em caso de erro
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignora erro ao limpar
    }
  }
}

// Uso
if (import.meta.main) {
  const componentName = Deno.args[0];

  if (!componentName) {
    console.log("Uso: deno run --allow-run --allow-read --allow-write scripts/install-component.ts <nome-do-componente>");
    Deno.exit(1);
  }

  await downloadAndCopyComponent(componentName);
}
