import { ensureDir } from "https://deno.land/std/fs/mod.ts";

async function downloadAndCopyComponent(componentName: string) {
  let tempDir: string | undefined;

  try {
    console.log("🔍 Verificando parâmetros...");
    if (!componentName) {
      throw new Error("Nome do componente não fornecido");
    }

    console.log("📁 Criando diretório temporário...");
    tempDir = await Deno.makeTempDir();
    const currentDir = Deno.cwd();
    const targetPath = `${currentDir}/src/components/${componentName}`;

    console.log("📦 Clonando repositório...");
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

    const cloneOutput = await cloneProcess.output();
    if (!cloneOutput.success) {
      const decoder = new TextDecoder();
      const errorLog = decoder.decode(cloneOutput.stderr);
      throw new Error(`Falha ao clonar repositório:\n${errorLog}`);
    }

    console.log("🔍 Configurando sparse-checkout...");
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
      const decoder = new TextDecoder();
      const errorLog = decoder.decode(sparseOutput.stderr);
      throw new Error(`Falha ao configurar sparse-checkout:\n${errorLog}`);
    }

    console.log("🔍 Verificando existência do componente...");
    const sourceDir = `${tempDir}/components/${componentName}`;
    try {
      await Deno.stat(sourceDir);
    } catch {
      throw new Error(`Componente '${componentName}' não encontrado no repositório.
        Verifique se:
        1. O nome está correto
        2. Você tem acesso ao repositório
        3. O componente existe no repositório`);
    }

    console.log("📁 Criando estrutura de diretórios...");
    await ensureDir(`${currentDir}/src/components/${componentName}`);

    console.log("📋 Copiando arquivos...");
    const copyProcess = new Deno.Command("cp", {
      args: [
        "-r",
        sourceDir,
        `${currentDir}/src/components/`
      ],
    });

    const copyOutput = await copyProcess.output();
    if (!copyOutput.success) {
      const decoder = new TextDecoder();
      const errorLog = decoder.decode(copyOutput.stderr);
      throw new Error(`Falha ao copiar arquivos:\n${errorLog}`);
    }

    console.log(`✅ Componente '${componentName}' instalado com sucesso em ${targetPath}`);

  } catch (error) {
    console.error("\n❌ Erro durante a instalação:");
    console.error("----------------------------");
    console.error(error.message);
    console.error("----------------------------");
    console.error("\n💡 Dicas de solução:");
    console.error("1. Verifique se tem acesso ao repositório");
    console.error("2. Confirme se o nome do componente está correto");
    console.error("3. Verifique suas credenciais do Git");
    console.error("4. Certifique-se de que tem permissões de escrita no diretório atual");
    
    Deno.exit(1);
  } finally {
    if (tempDir) {
      console.log("\n🧹 Limpando arquivos temporários...");
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch (error) {
        console.error("⚠️  Aviso: Não foi possível limpar alguns arquivos temporários");
      }
    }
  }
}

// Uso
if (import.meta.main) {
  const componentName = Deno.args[0];

  if (!componentName) {
    console.error("\n❌ Erro: Nome do componente não fornecido");
    console.error("\n📘 Uso correto:");
    console.error("deno run --allow-run --allow-read --allow-write scripts/install-component.ts <nome-do-componente>");
    console.error("\n📝 Exemplo:");
    console.error("deno run --allow-run --allow-read --allow-write scripts/install-component.ts MultiSliderRange");
    Deno.exit(1);
  }

  await downloadAndCopyComponent(componentName);
}
