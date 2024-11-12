import { ensureDir } from "https://deno.land/std/fs/mod.ts";

async function downloadAndCopyComponent(componentName: string) {
  try {
    const currentDir = Deno.cwd();
    const tempDir = await Deno.makeTempDir();
    const targetPath = `${currentDir}/src/components/${componentName}`;

    // Clona apenas a pasta específica do componente
    const cloneProcess = new Deno.Command("git", {
      args: [
        "clone",
        "--depth", "1",
        "--filter=blob:none",
        "--sparse",
        "git@github.com:deco-sites/components.git",
        tempDir
      ],
    });

    await cloneProcess.output();

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

    await sparseProcess.output();

    // Cria diretório de destino
    await ensureDir(`${currentDir}/src/components`);

    // Move o componente para o destino
    await Deno.rename(
      `${tempDir}/components/${componentName}`,
      targetPath
    );

    // Limpa diretório temporário
    await Deno.remove(tempDir, { recursive: true });

    console.log(`✅ Componente '${componentName}' instalado com sucesso em ${targetPath}`);
  } catch (error) {
    console.error(`❌ Erro:`, error.message);
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