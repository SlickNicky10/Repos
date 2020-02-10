// Repos by SlickNicky10
// Version: 0.1.0
// Github: https://github.com/SlickNicky10/Repos
module.exports = {
    init: options => {
        const log = message => java.lang.System.out.println(`[Repos] ${message}`);
        log("Initializing Repos...");
        
        if(!options) options = {};
        let {enableCLI, CLICommandName, CLICommandAliases} = options;
        if(CLICommandAliases == null) CLICommandAliases = [];

        const extraLog = (name, message) => log(`[${name}] ${message}`);
        const base_path = "plugins/Drupi/scripts/modules/Repos";

        const UUID = java.util.UUID;
        const File = java.io.File;

        function del(directory){
            if(directory.isDirectory()){
                const files = directory.listFiles();
                for(var file in files){
                    del(files[file]);
                }
            }
            directory.delete();
        }

        function download(url, file){
            if(file.exists()) file.delete();
            url = new java.net.URL(url);
            const rbc = java.nio.channels.Channels.newChannel(url.openStream());
            const fos = new java.io.FileOutputStream(file);
            fos.getChannel().transferFrom(rbc, 0, java.lang.Long.MAX_VALUE);
            fos.close();
            rbc.close();
        }
        
        function createNewRepoID(){
            let id;
            while(true){
                const i = UUID.randomUUID().toString();
                if(!repos[i]){
                    id = i;
                    break;
                }
            }
            return id;
        }

        let repos = {};

        const default_repo = {name: "Stacket", description: "Official Drupi repo", url: "https://api.stacket.net"};
        
        const reposFile = new File(`${base_path}/repos.json`);
        
        function saveRepos(){
            manager.writeToFile(reposFile, JSON.stringify(repos, null, 4));
        }

        if(!reposFile.exists()){
            log("Repos file not found. Creating one and adding the default (Stacket) repository...");
            reposFile.createNewFile();
            repos.default = default_repo;
            saveRepos();
        } else repos = JSON.parse(manager.readFile(reposFile));

        function installDependency(id, name, tempPaths, originalPackageName, update){
            const base_url = `${repos[id].url}/modules/${name}`;
            const moduleObject = JSON.parse(http.get(base_url));
            if(!moduleObject.package) return log(`[ERROR] Required dependency is not a valid package. If you are the repository owner, and you believe this is in error, please look into this issue!`);
            name = moduleObject.package.name;
            const dl = new File(`${base_path}/downloads/${id}/modules`);
            if(!dl.exists()) dl.mkdirs();
            const pkgName = `${repos[id].name}/${name}`;
            const modulePath = new File(`${base_path}/packages/${id}/modules/${name}`);
            if(modulePath.exists()){
                if(!update) return extraLog(pkgName, "Dependency is already installed, skipping it...");
                else extraLog(pkgName, "Dependency is already installed, updating it...");
            }
            extraLog(pkgName, `Downloading package...`);
            const zipFile = new File(`${base_path}/downloads/${id}/modules/${name}.zip`);
            tempPaths.push(zipFile);
            download(http.get(`${base_url}/zip`), zipFile);
            extraLog(pkgName, `Extracting package...`);
            const extractDir = new File(`${base_path}/downloads/${id}/modules/${name}`);
            extractDir.mkdirs();
            tempPaths.push(extractDir);
            manager.unzip(zipFile, extractDir);
            extraLog(pkgName, "Moving items into place...");
            modulePath.mkdirs();
            const extractedModule = extractDir.listFiles()[0];
            manager.moveFiles(modulePath, extractedModule);
            extraLog(pkgName, `Checking for dependencies...`);
            const packageJsonFile = new File(`${base_path}/packages/${id}/modules/${name}/package.json`);
            if(packageJsonFile.exists()){
                const packageJson = JSON.parse(manager.readFile(packageJsonFile));
                if(packageJson.dependencies) packageJson.dependencies.forEach(dependency => installDependency(id, dependency, tempPaths, pkgName));
            }
            extraLog(originalPackageName, `Successfully installed dependency "${pkgName}".`);
        }

        const e = {
            getRegisteredRepos: () => repos,
            installRepo: (url, callback) => {
                setAsyncTimeout(() => {
                    extraLog(url, `Installing repo...`);
                    if(url.endsWith("/")) url = url.slice(0, -1);
                    let obj;
                    let update = false;
                    function getID(){
                        for(var i in repos){
                            if(update) continue;
                            if(repos[i].url == url){
                                update = true;
                                return i;
                            }
                        }
                        return createNewRepoID();
                    }
                    const id = getID();
                    try {
                        const meta = JSON.parse(http.get(`${url}/meta`));
                        if(!meta.repo_meta){
                            log("[WARN] This repository has not configured their metadata, and we couldn't automatically include the repository's name and description for you. If you would like to manually include this information, you are free to do so.");
                            obj = {name: "<unnamed repo>", description: "No description provided.", url};
                            return;
                        }
                        const {name, description} = meta.repo_meta;
                        obj = {name: (name != null) ? name : "<unnamed repo>", description: (description != null) ? description : "No description provided.", url};
                        log(`Successfully imported repo from ${url}`);
                    } catch(e){
                        log("Something went wrong while attempting to fetch metadata about this repository. Because of this, we couldn't automatically fetch the repository's name and description for you. If you would like to manually include this information, you are free to do so.");
                        obj = {name: "<unnamed repo>", description: "No description provided.", url};
                    }
                    repos[id] = obj;
                    saveRepos();
                    if(callback) callback(id);
                }, 0);
            },
            uninstallRepoById: id => {
                if(Object.keys(repos).indexOf(id) < 0) return log("That repo is not installed!");
                const name = repos[id].name;
                extraLog(name, `Uninstalling repo ${id}...`);
                delete repos[id];
                saveRepos();
                del(new File(`${base_path}/packages/${id}`));
                const packages = new File(`${base_path}/packages`);
                if(packages.exists() && packages.listFiles().length < 1) del(packages);
                extraLog(name, `Repo ${id} has been uninstalled.`);
            },
            uninstallRepoByURL: function(url){
                for(var i in repos){
                    if(repos[i].url == url) return this.uninstallRepoById(i);
                }
                return log("That repo is not installed!");
            },
            getRepoIdByURL: url => {
                for(var i in repos){
                    if(repos[i].url == url) return i;
                }
                log(`[WARN] Repo ${url} is not installed on this server. Any packages depending on it WILL encounter problems until you resolve this issue!`);
            },
            installModule: function(id, name, update, callback){
                setAsyncTimeout(() => {
                    if(!repos[id]) return log(`No repository with ID ${id} is installed on this server.`);
                    const base_url = `${repos[id].url}/modules/${name}`;
                    const moduleObject = JSON.parse(http.get(base_url));
                    if(!moduleObject.package) return log("[ERROR] Specified module is not a valid package. If you are the repository owner, and you believe this is in error, please look into this issue!");
                    name = moduleObject.package.name;
                    const dl = new File(`${base_path}/downloads/${id}/modules`);
                    if(!dl.exists()) dl.mkdirs();
                    const pkgName = `${repos[id].name}/${name}`;
                    extraLog(pkgName, `Downloading package...`);
                    const tempPaths = [];
                    const zipFile = new File(`${base_path}/downloads/${id}/modules/${name}.zip`);
                    tempPaths.push(zipFile);
                    download(http.get(`${base_url}/zip`), zipFile);
                    extraLog(pkgName, `Extracting package...`);
                    const extractDir = new File(`${base_path}/downloads/${id}/modules/${name}`);
                    tempPaths.push(extractDir);
                    extractDir.mkdirs();
                    manager.unzip(zipFile, extractDir);
                    extraLog(pkgName, "Moving items into place...");
                    const modulePath = new File(`${base_path}/packages/${id}/modules/${name}`);
                    if(modulePath.exists()) del(modulePath);
                    modulePath.mkdirs();
                    const extractedModule = extractDir.listFiles()[0];
                    manager.moveFiles(modulePath, extractedModule);
                    extraLog(pkgName, "Checking for dependencies...");
                    const packageJsonFile = new File(`${base_path}/packages/${id}/modules/${name}/package.json`);
                    if(packageJsonFile.exists()){
                        const packageJson = JSON.parse(manager.readFile(packageJsonFile));
                        if(packageJson.dependencies) packageJson.dependencies.forEach(dependency => installDependency(id, dependency, tempPaths, pkgName, update));
                    }
                    extraLog(pkgName, "Removing temporary files...");
                    tempPaths.forEach(dir => del(dir));
                    if(dl.listFiles().length < 1) del(dl);
                    const repoDownloads = new File(`${base_path}/downloads/${id}`);
                    const downloads = new File(`${base_path}/downloads`);
                    if(repoDownloads.listFiles().length < 1) del(repoDownloads);
                    if(downloads.listFiles().length < 1) del(downloads);
                    extraLog(pkgName, `Installation successful!`);
                    if(callback) callback();
                }, 0);
            },
            uninstallModule: (id, name) => {
                if(!repos[id]) return log(`No repository with ID ${id} is installed on this server.`);
                const modulePath = new File(`${base_path}/packages/${id}/modules/${name}`);
                const pkgName = `${repos[id].name}/${name}`;
                if(!modulePath.exists()) return extraLog(pkgName, "Module is not installed.");
                extraLog(pkgName, "Uninstalling module...");
                del(modulePath);
                const repoModules = new File(`${base_path}/packages/${id}/modules`);
                const repoFiles = new File(`${base_path}/packages/${id}`);
                const packages = new File(`${base_path}/packages`);
                if(repoModules.listFiles().length < 1) del(repoModules);
                if(repoFiles.listFiles().length < 1) del(repoFiles);
                if(packages.listFiles().length < 1) del(packages);
                extraLog(pkgName, "Uninstallation completed!");
            },
            require: (id, name, useEnv, method) => {
                if(new File(`${base_path}/packages/${id}/modules/${name}`).exists()){
                    const mod = require(`./packages/${id}/modules/${name}`);
                    if(!useEnv) return mod;
                    const env = {
                        path: `${base_path}/packages/${id}/modules/${name}`
                    }
                    if(typeof mod == "function"){
                        return mod(env);
                    }
                    if(typeof mod == "object"){
                        if(method != null) return mod[method](env);
                        log(`[ERROR] Module ${name} returns an object, and no initialization method to pass environment variables to was passed.`);
                    }
                }
            }
        }

        if(enableCLI){
            const cmdName = (CLICommandName != null) ? CLICommandName : "repos";
            if(CLICommandAliases.length < 1){
                log(`Setting up Repos CLI with command name "${cmdName}"...`);
            } else {
                log(`Setting up Repos CLI with command name "${cmdName}" and aliases "${CLICommandAliases.join('", "')}"...`);
            }

            let version;

            try {
                version = JSON.parse(manager.readFile(new File(`${base_path}/package.json`))).version;
            } catch(e){
                version = -1;
            }

            const verMsg = (version != -1) ? `This server is using Repos version ${version}.` : "Unable to identify this server's Repos version. Your package.json file is corrupted. It is strongly recommended that you re-install Repos.";

            command.create(cmdName, {
                prefix: "repos",
                description: "Main command for the Repos CLI",
                aliases: CLICommandAliases
            }, (sender, a) => {
                // Thanks, Nashorn.
                const args = [];
                for(const i in a){
                    args[i] = a[i];
                }
                if(command.isPlayerSender(sender)) return sender.sendMessage(color("&cThis command can only be used by the console!"));
                const validArgs = ["repo", "modules", "info"];
                if(args.length < 1 || (validArgs.indexOf(args[0]) < 0 && args.length == 1)) return sender.sendMessage(
                    [
                        "",
                        "----- Repos Help -----",
                        "",
                        `/${cmdName} repo <...> - Manage your installed repositories.`,
                        `/${cmdName} modules <...> - Manage modules you have installed from your repositories.`,
                        `/${cmdName} info - View information about Repos!`
                    ].join("\n")
                );
                if(args[0] == "info") return sender.sendMessage(`\nRepos is a module built to enable freedom and further versatility for distributing Drupi packages. Anyone can easily create a repository and share their packages with the world!\n \n${verMsg}`);
                if(args[0] == "repo"){
                    const validArgs = ["i", "install", "u", "uninstall", "r", "remove", "repair"];
                    if(args.length < 2 || validArgs.indexOf(args[1]) < 0) sender.sendMessage(
                        [
                            "",
                            "----- Repo Management Commands -----",
                            "",
                            `/${cmdName} repo (i/install) <URL> - Installs a remote repository, adding it to your available sources for installing packages from.`,
                            `/${cmdName} repo (u/uninstall/r/remove) <URL> (--confirm | --id) - Uninstalls a remote repository, and completely uninstalls any packages installed from that repo. This action cannot be undone!`,
                            "  --confirm: Confirms the removal of the specified module. Required for the uninstallation to proceed!",
                            "  --id: Allows the usage of a remote repository's local ID instead of its URL.",
                            `/${cmdName} repo repair - Repairs the installation for the default repository in case it was uninstalled by mistake.`
                        ].join("\n")
                    );
                    else if(["i", "install"].indexOf(args[1]) >= 0){
                        if(args.length < 3) return sender.sendMessage(`\nUsage:\n/${cmdName} repo ${args[1]} <URL>`);
                        e.installRepo(args[2]);
                    } else if(["u", "uninstall", "r", "remove"].indexOf(args[1]) >= 0){
                        if(args.length < 4 || args.indexOf("--confirm") < 0) return log(`Uninstalling repos is a permanent action that cannot be undone. Any packages installed from this repository WILL be uninstalled, and their data will be deleted!\nIf you wish to continue, use the following command instead:\n/${cmdName} repo ${args[1]} ${args[2]} --confirm`);
                        function removeDefaultWarning(){
                            log(`Uninstalling the default repository is highly unrecommended. If you wish to add it back in the future, you'll need to use the following command to properly re-add it:\n/${cmdName} repo repair\nIf you wish to uninstall the default repository, manually remove it from your repos.json file and reload Drupi.`)
                        }
                        if(args.length < 3) return sender.sendMessage(`\nUsage:\n/${cmdName} repo ${args[1]} <URL>`);
                        if(args.length < 5 || args.indexOf("--id") < 0){
                            if(args[2] == "https://api.stacket.net") return removeDefaultWarning();
                            return e.uninstallRepoByURL(args[2]);
                        }
                        if(args[2] == "default") return removeDefaultWarning();
                        e.uninstallRepoById(args[2]);
                    } else if(args[1] == "repair"){
                        repos.default = default_repo;
                        saveRepos();
                        log("The default repository has been successfully repaired!");
                    }
                } else if(args[0] == "modules"){
                    const validArgs = ["i", "install", "u", "uninstall", "r", "remove"];
                    if(args.length < 2 || validArgs.indexOf(args[1]) < 0) sender.sendMessage(
                        [
                            "",
                            "----- Module Management Commands -----",
                            "",
                            `/${cmdName} modules (i/install) <URL> <module> (--update | --id) - Installs a module from a remote repository.`,
                            "  --id: Allows the usage of a remote repository's local ID instead of its URL.",
                            "  --update: Forces re-installation of the module's dependencies. Use this if multiple dependencies required for your module's desired behavior need to be updated! WARNING: Updating a module WILL reset its files. If your module is storing data inside of files within its storage, make a backup of these files first!",
                            `/${cmdName} modules (u/uninstall/r/remove) <URL> <module> (--confirm | --id) - Uninstalls a module from a remote repository, and completely removes all files from that module's storage. This action cannot be undone!`,
                            "  --confirm: Confirms the removal of the specified module. Required for the uninstallation to proceed!",
                            "  --id: Allows the usage of a remote repository's local ID instead of its URL."
                        ].join("\n")
                    );
                    else if(["i", "install"].indexOf(args[1]) >= 0){
                        if(args.length < 4) return sender.sendMessage(`\nUsage:\n/${cmdName} repo ${args[1]} <URL> <module> (--update)`);
                        e.installModule((args.indexOf("--id") >= 0) ? args[2] : e.getRepoIdByURL(args[2]), args[3], args.indexOf("--update") >= 0);
                    } else if(["u", "uninstall", "r", "remove"].indexOf(args[1]) >= 0){
                        if(args.length < 4) return sender.sendMessage(`\nUsage:\n/${cmdName} repo ${args[1]} <URL> <module> (--confirm | --id)`);
                        if(args.indexOf("--confirm") < 0) return log(`Uninstalling modules is a permanent action that cannot be undone. Any files stored in this module's storage WILL be deleted!\nIf you wish to continue, use the following command instead:\n/${cmdName} modules ${args[1]} ${args[2]} ${args[3]} --confirm`);
                        e.uninstallModule((args.indexOf("--id") >= 0) ? args[2] : e.getRepoIdByURL(args[2]), args[3]);
                    }
                }
            });

            log("CLI setup complete.");
        }

        log("Repos initialization complete!");
        return e;
    }
}
