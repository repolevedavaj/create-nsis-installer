import * as core from '@actions/core'
import path, {resolve, sep} from "path";
import * as fs from "fs";
import {mkdtemp} from "fs";
import {tmpdir} from "os";
import * as exec from '@actions/exec';

const PACKAGE_IDENTIFIER_PATTERN = /^(([A-Z][a-z]+)+)\.(([A-Z][a-z]+)+)$/;
const MAKENSIS_EXECUTABLE = '"C:\\Program Files (x86)\\NSIS\\makensis.exe"';

function packageIdentifierPartToDirName(packageIdentifierPart: string) {
    return packageIdentifierPart.replace(/([a-z])([A-Z])/g, '$1-$2')
}

function generateNsisConfig(packageIdentifier: string,
                            packageName: string,
                            packageVersion: string,
                            sourceDirectory: string) {

    const matcher = packageIdentifier.match(PACKAGE_IDENTIFIER_PATTERN)
    if (!matcher) {
        throw Error(`packageIdentifier must match ${PACKAGE_IDENTIFIER_PATTERN}`)
    }

    const installDirParentName = packageIdentifierPartToDirName(matcher[1])
    const installDirName = packageIdentifierPartToDirName(matcher[3])

    const packageFiles = fs.readdirSync(sourceDirectory).map(packageFileName => `${sourceDirectory}/${packageFileName}`)
    const targetFile = `${sourceDirectory}-setup.exe`

    return `
!define PRODUCT_NAME "${packageIdentifier}"
!define PRODUCT_VERSION "${packageVersion}"
!define PRODUCT_UNINST_KEY "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

Name "${packageName}"
OutFile "${resolve(targetFile)}"
InstallDir "$PROGRAMFILES64\\${installDirParentName}\\${installDirName}"
SilentInstall silent
SilentUninstall silent

Section
  SetOutPath "$INSTDIR"
  SetOverwrite on
${packageFiles.map(packageFile => `  File "${resolve(packageFile)}"`).join('\n')}
  EnVar::SetHKLM
  EnVar::AddValue "Path" "$INSTDIR"
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\\uninst.exe"
  WriteRegStr \${PRODUCT_UNINST_ROOT_KEY} "\${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr \${PRODUCT_UNINST_ROOT_KEY} "\${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\\uninst.exe"
  WriteRegStr \${PRODUCT_UNINST_ROOT_KEY} "\${PRODUCT_UNINST_KEY}" "DisplayVersion" "\${PRODUCT_VERSION}"
SectionEnd

Section Uninstall
  EnVar::SetHKLM
  EnVar::DeleteValue "Path" "$INSTDIR"
  Delete "$INSTDIR\\uninst.exe"
${packageFiles.map(packageFile => `  Delete "$INSTDIR\\${path.parse(packageFile).base}"`).join('\n')}

  RMDir "$INSTDIR"

  DeleteRegKey \${PRODUCT_UNINST_ROOT_KEY} "\${PRODUCT_UNINST_KEY}"
  SetAutoClose true
SectionEnd
`
}

function getErrorMessage(error: any): string {
    if (error instanceof Error) {
        return error.message
    } else {
        return error
    }
}


async function run(): Promise<void> {
    try {
        mkdtemp(`${tmpdir()}${sep}`, (error, directory) => {
            if (error) {
                throw error;
            }

            const packageIdentifier = core.getInput('package-identifier', {required: true})
            const packageName = core.getInput('package-name', {required: true})
            const packageVersion = core.getInput('package-version', {required: true})
            const sourceDirectory = core.getInput('source-directory', {required: true})

            const nsisConfigAsString = generateNsisConfig(packageIdentifier, packageName, packageVersion, sourceDirectory)
            if (core.isDebug()) {
                core.debug(nsisConfigAsString)
            }

            const nsisConfigFile = `${directory}${sep}installer.nsis`
            fs.writeFileSync(nsisConfigFile, nsisConfigAsString)

            exec.exec(MAKENSIS_EXECUTABLE, [nsisConfigFile])
        });
    } catch (error) {
        core.setFailed(getErrorMessage(error))
    }
}

run()
