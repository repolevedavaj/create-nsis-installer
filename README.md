# Create CLI app NSIS installer

![Build](https://github.com/repolevedavaj/create-cli-app-nsis-installer/workflows/Build/badge.svg)

Creates a simple CLI app installer using NSIS (only supported on Windows). Note that NSIS must be installed on the runner (e.g. using https://github.com/marketplace/actions/install-nsis).

The idea is to provide an easy way of building installers which can be used to install a CLI app through `winget` as they currently only support installer based packages.

## Inputs

## `package-identifier`

The identifier of the package. The identifier must consist of two pascal cased values. The first part will be used as parent and the second as child directory in the programs root directory.

## `package-name`

The human-readable package name.

## `package-version`

The package version.

## `source-directory`

The source directory containing the files should be installed. The installer will be named equal to the directory plus the "-setup.exe" suffix.

## Example usage

```shell
uses: repolevedavaj/create-cli-app-nsis-installer@v1
with:
  package-identifier: ProjectEnv.ProjectEnvCli
  package-name: Project-Env Cli
  package-version: 1.0.0
  source-directory: project-env-cli-1.0.0-windows-amd64
```