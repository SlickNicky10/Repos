# Repos

Repos module for use with Drupi. Download Drupi at https://stacket.net/drupi

The current latest version of Repos is **0.1.1**, and this documentation will always be in reference to the latest version of Repos.

# What's Repos?

Repos is a Drupi module that enables the distribution of packages over custom community-made repositories. Anyone can host a repository, using whatever HTTP backend server you'd like!

# Install Guide

Firstly, make sure that Drupi is installed on your server. If it isn't, you can download it from https://stacket.net/drupi. Once Drupi is installed, restart your server and execute the command /drupi install Repos. You can now use Repos!

# Using Repos

To properly require Repos, it needs to be initalized.

To initalize Repos using all default settings:

```js
const Repos = require("Repos").init();
```

However, Repos has a few custom settings, specifically for the built-in Repos CLI, which makes managing repos and packages a breeze with a simple command-line interface.

To initalize Repos, enabling its CLI, with the CLI's default settings:

```js
const Repos = require("Repos").init({
    enableCLI: true
});
```

There are two other options:

`CLICommandName` (defaults to "repos") - name for the Repos CLI main command.

`CLICommandAliases` (defaults to an empty array) - an optional set of aliases for the Repos CLI main command.

An example, changing the default "repos" command name to "repo", and adding "rep" as an alias:

```js
const Repos = require("Repos").init({
    enableCLI: true,
    CLICommandName: "repo",
    CLICommandAliases: ["rep"]
});
```

# Using the Repos CLI

The Repos CLI is a great way to manage your repositories and packages. Here's how to use it:

`/repos info` - Gives a description of Repos, and displays the current version of Repos installed on the server.

`/repos repo` - Commands for managing your installed repositories:

  `/repos repo (i/install) <URL>` - Installs a remote repository, adding it to your available sources for installing packages from.

  `/repos repo (u/uninstall/r/remove) <URL> (--confirm | --id)` - Uninstalls a remote repository, and completely uninstalls any packages installed from that repo. This action cannot be undone!

    `--confirm` - Confirms the removal of the specified module. Required for the uninstallation to proceed!

    `--id` - Allows the usage of a remote repository's local ID instead of its URL.

  `/repos repo repair` - Repairs the installation for the default repository in case it was uninstalled by mistake.

`/repos modules` - Commands for managing your installed modules:

  `/repos modules (i/install) <URL> <module> (--update | --id)` - Installs a module from a remote repository.

    `--id` - Allows the usage of a remote repository's local ID instead of its URL.

    `--update` - Forces re-installation of the module's dependencies. Use this if multiple dependencies required for your module's desired behavior need to be updated! WARNING: Updating a module WILL reset its files. If your module is storing data inside of files within its storage, make a backup of these files first!

  `/repos modules (u/uninstall/r/remove) <URL> <module> (--confirm | --id)` - Uninstalls a module from a remote repository, and completely removes all files from that module's storage. This action cannot be undone!

    `--confirm` - Confirms the removal of the specified module. Required for the uninstallation to proceed!

    `--id` - Allows the usage of a remote repository's local ID instead of its URL.

# Loading modules in scripts

To load a module installed using Repos, you should use the `Repos.require` function.

Repos.require has *4* arguments, *2* of which are optional:

Repos.require(Repo ID, Module Name, useEnv, method)

*Tip: the default Stacket repository will always have the ID 'default'! If your installation of the Stacket repository ever gets accidentally uninstalled, you can repair it with the Repos CLI using /repos repo repair.*

To load a module normally, you don't need `useEnv` or `method` to be set. These methods could actually *break most modules*. These methods are for modules made specifically with Repos in mind, as they control how Repos will attempt to pass environment variables to the module (such as its base directory). **Most if not all modules from the default / Stacket repository will NOT work if useEnv is enabled.**

## Example

In this example, let's use the Repos CLI to install ItemUtils from the default / Stacket repository, and then import it:

First, Repos needs to be installed and running with Repos CLI enabled:

```js
const Repos = require("Repos").init({
    enableCLI: true
});
```

Next, ItemUtils must be installed through the Repos CLI.

`repos modules install default ItemUtils --id`

This command is telling Repos to install the ItemUtils module from the repository with the local ID of "default", because of the `--id` flag.

Once installed, ItemUtils can be loaded in a Drupi script using `Repos.require`:

```js
const {ItemBuilder, InventoryBuilder, GUIManager} = Repos.require("default", "ItemUtils");
```

*Tip: Repos has a built-in function for getting a repository's local ID from its URL. This may be easier while making scripts or writing documentation for your own modules/repositories! This function is: Repos.getRepoIdByURL(url)*

## Using a remote repository

To use a remote repository with Repos, first that repository must be installed. This can be done with the Repos CLI.

For this example, let's install my TaskUtils module from my own repository.

`repos repo install https://repo.slicknicky10.me`

`repos modules install https://repo.slicknicky10.me TaskUtils`

You will notice that inside of the Repos folder, a packages folder was created. Inside of it, we have a folder named by the ID of the repo "https://repo.slicknicky10.me", and inside of it resides our installed packages from that repo. This is why the `Repos.require` function exists, it makes loading your installed modules much easier.

If you want, you could just copy-paste this ID and use it in your code like this:

```js
const TaskUtils = Repos.require("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "TaskUtils");
```

However, since a repo's local ID is randomly generated every time it is installed on a server, hard-coding a repo's local ID into your code is generally a bad idea.

Instead, you should use the `Repos.getRepoIdByURL` function mentioned earlier, like this:

```js
const repo = Repos.getRepoIdByURL("https://repo.slicknicky10.me");
const TaskUtils = Repos.require(repo, "TaskUtils");
```

Not only does this method further improve the reliability of your code, but it also makes it easier to understand, since you can actually see what repo you're loading from.

## Repos ENV

The 2 optional arguments in the `Repos.require` function are for the Repos ENV. The Repos ENV is an API provided by Repos that gives module developers access to environment information about their module. In Repos 0.1.0, the only variable passed is that module's base directory, however this can still prove to be very useful for certain modules.

**WARNING: If a module is not designed to use the Repos ENV, do NOT enable it. It WILL cause errors when loading the module!**

If the module you are loading returns a FUNCTION, you do not need to pass a method, you only need to enable the Repos ENV, which can be done like this:

```js
const module = Repos.require(repo, "some-module", true);
```

If the module you are loading returns an OBJECT with a METHOD FOR INITIALIZATION, you need to pass a method, which can be done like this:

```js
const module = Repos.require(repo, "some-module", true, "init");
```

`init` should be changed to whatever method name that module uses.

### For module developers:

The Repos ENV passes an object with the following properties:

`path` *(string)* - path to the root directory of the module.

`repo_path` *(string)* - path to the root directory of the repository's installed packages. ***(NEW)***

`repo_id` *(string)* - the repository's local ID. ***(NEW)***

`instance` *(Repos Instance)* - the Repos instance, for example: to load other modules installed from a repository. ***(NEW)***

# Using the Repos API

If you don't like the Repos CLI, or want to make your own script or module that hooks into the Repos API, you easily can!

Everything in Repos is based on its method-based API:

`Repos.getRegisteredRepos()` *(JSON Object)* - gets the currently loaded repositories.

`Repos.installRepo(url, callback)` - installs the repo from the specified URL. Accepts an optional callback, as this is an async function.

`Repos.uninstallRepoById(id)` - uninstalls the repo from the specified local ID.

`Repos.uninstallRepoByURL(url)` - uninstalls the repo from the specified URL.

`Repos.getRepoIdByURL(url)` - gets an installed repo's local ID from its URL.

`Repos.installModule(id, name, update [default false], callback)` - installs a module from a repo by that repo's local ID. If update is set to true, any already installed dependencies for this module will be forcefully reinstalled/updated. Accepts an optional callback, as this is an async function.

`Repos.uninstallModule(id, name)` - uninstalls a module from a repo by that repo's local ID.

`Repos.require(id, name, useEnv, method)` *(any)* - loads a module from the repo with the given local ID. Contains optional settings for injecting the Repos ENV into the module (see "Loading modules in scripts").

# Creating a repo

NOTE: The requirements for creating a repo and features that repos can serve was last updated in **Repos 0.1.0**.

The following HTTP endpoints are required for your repo to work correctly with Repos. Meta is optional, but highly recommended.

Note: your repo does NOT have to be at the root of your domain (i.e. yourdomain.com/repo could also be used as a root).

`GET /meta` - JSON object containing your repo's metadata.

Example response:

```json
{
    "repo_meta": {
        "name": "testRepo",
        "description": "A test repo!"
    }
}
```

`GET /modules/:module` - JSON object containing a module's package. Only the `name` field of the package is required.

Example response:

```json
{
    "package": {
        "name": "TestModule"
    }
}
```

`GET /modules/:module/zip` - URL to a zip file to download that module from:

Example response:

```
https://github.com/example/test/zipball/master
```
