'use babel';

/**
 *
 *  hexo-insert-images
 *  @description A Atom plugin for inserting image comfortable.
 *  @author SevensChan <297495165@qq.com>
 *
**/

import { CompositeDisposable } from 'atom';
const {dialog} = require('electron').remote;
const fs = require('fs');
const path = require("path");
const readYaml = require('read-yaml');

export default {

  subscriptions: null,
  editor: null,
  notification: null,
  path: '',
  sourcePath: '',
  configPath: '',
  postName: '',
  config: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'hexo-insert-image:toggle': () => this.runCommand()
    }));
  },

  runCommand() {
    // Init
    this.editor = atom.workspace.getActiveTextEditor();
    this.path = this.editor.getPath();
    this.postName = this.path.substring(this.path.lastIndexOf('/')+1).replace('.md','');
    this.sourcePath = this.path.substring(0,this.path.indexOf('/source/_post')) + '/source';
    this.configPath = this.path.substring(0,this.path.indexOf('/source/_post')) + '/_config.yml';

    // Check is Hexo folder
    if (this.checkIsHexo()){
      //read config
      this.config = readYaml.sync(this.configPath);

      // open File selection dialog
      this.openDialog();
    }else{
      // If not
      let _this = this;
      this.notification = atom.notifications.addWarning("You must use this command in the /hexo/source/_posts/*.md files .", {
        dismissable: true,
        buttons: [
          {
            text: "Ok, I see.",
            onDidClick: function() {
              return _this.notification.dismiss();
            }
          }
        ]
      });
    }
  },

  openDialog() {
    dialog.showOpenDialog({
  		properties: ['openFile', 'multiSelections']
  	}, selectedFiles => this.insertMarkdownImg(selectedFiles));
  },

  insertMarkdownImg(selectedFiles) {
      let _this = this;
      for (let i in selectedFiles){
        (async function(file){
          let filename = await _this.copyFileToImage(file);
          _this.editor.insertNewline();
          // Insert Img Tag
          _this.editor.insertText(`![${selectedFiles[i].substring(selectedFiles[i].lastIndexOf('/')+1)}](${filename})`);
        })(selectedFiles[i]);
      }
  },

  // Copy image to local path
  async copyFileToImage(path) {
    let _this = this;
    return new Promise(async resolve => {
      let fileName = _this.postName + '-' + path.substring(path.lastIndexOf('/')+1);

      // Image path
      let imagePath,returnName;
      if (this.config.post_asset_folder){
        imagePath = _this.sourcePath + '/_posts/' + _this.postName + '/';
        returnName = fileName;
      }else{
        imagePath = _this.sourcePath + '/images/';
        returnName = imagePath + fileName;
      }

      if (!fs.existsSync(imagePath)){
        fs.mkdirSync(imagePath);
      }

      await _this.copyAction(path, imagePath + fileName);
      resolve(returnName);
    });
  },

  copyAction(file,target){
    return new Promise(resolve => {
      fs.createReadStream(file).pipe(fs.createWriteStream(target));
      resolve();
    });
  },

  checkIsHexo() {
    let packagePath = this.path.substring(0,this.path.indexOf('/source/_post')) + '/package.json';
    var inHexoSite = false;

    try {
      var _require = require(packagePath),
          dependencies = _require.dependencies,
          devDependencies = _require.devDependencies;

      inHexoSite = dependencies && dependencies.hexo || devDependencies && devDependencies.hexo;
    } catch (err) {
      /* ignore */
    }

    return inHexoSite;
  },
};
