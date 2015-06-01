(function () {

  var request = require('request'),
      exec = require('child_process').exec,
      execSync = require('child_process').execSync,
      interfaces = require('os').networkInterfaces(),
      
      iconv = require('iconv-lite'),
      crypto = require('crypto');

  var server = require('../controllers/server'),
      storage = require('../controllers/storage');

  var slicer=require('../controllers/slicer');

  var peers = {};
  var prefix = '', suffix = 1, selfSuffix = 0;
  var targetNum, targetUrl, targetHeadUrl;


  var host = server.getBaseUrl();

  window.onload = function () {
    Page.init();
    Core.init();
    // $('#nav-item-setting').click();
  }

  function sizeOf (obj) {
    var size = 0;
    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        size++;
      }
    }
    return size;
  }

  var Page = {
    init : function () {
      this.initViews();
      this.initEvents();
      this.refreshReceived();
    },
    initViews : function () {
      var name = storage.getLocalStorage('name');

      $('#nav-user').text(name);
      $('#setting-name').val(name);
      $('#host').text(host);

      if (storage.getLocalStorage('dirSet') == 'default') {
        $('#dir-default').attr('checked', 'default');
      } else {
        $('#dir-ask').attr('checked', 'ask');
      }

      if (storage.getLocalStorage('dir')) {
        $('#dir-link').attr('title', storage.getLocalStorage('dir'));
      }

      if (storage.getLocalStorage('del') == 'keep') {
        $('#del-keep').attr('checked', true);
      }

      new QRCode(document.getElementById("qrcode"), {
        text: host,
        width : 150,
        height : 150
      });
    },
    initEvents : function () {
      $('.nav-item').on('click', this.switchSection);
      $('#setting-name').on('keyup', this.updateName);
      $('#dir-ask').on('click', this.setDirAsk);
      $('#dir-default').on('click', this.setDirDefault);
      $('#dir-link').on('click', this.updateDirDefault);
      $('#del-keep').on('click', this.setDeleteKeep);
      $('#file').on('change', this.sendFile);
    },
    switchSection : function () {
      if (!$(this).hasClass('nav-item-current')) {
        Page.switchMain(this);
        Page.switchNav(this);
      }
    },
    switchNav : function (nav) {
      var target = $(nav).attr('id').split('-').pop();
      $('.nav-item-current').removeClass('nav-item-current');
      $(nav).addClass('nav-item-current');
    },
    switchMain : function (nav) {
      var current = $('.nav-item-current').attr('id').split('-').pop();
      var target = $(nav).attr('id').split('-').pop();
      var currentDom = $('#section-' + current);
      var targetDom = $('#section-' + target);
      if (target == 'devices' && sizeOf(peers) <= 0) {
        this.showProgress('Searching For Devices...');
      } else {
        this.hideProgress();
      }
      targetDom.show();
      if (currentDom.attr('index') < targetDom.attr('index')) {
        currentDom.addClass('section-popBig');
        targetDom.addClass('section-popSmall');
      } else {
        currentDom.addClass('section-shrinkSmall');
        targetDom.addClass('section-shrinkBig');
      }
      setTimeout(function () {
        currentDom.hide();
        $('.section').removeClass('section-popBig section-popSmall section-shrinkBig section-shrinkSmall');
      }, 2000);
    },
    showProgress : function (hint) {
      if ($('#nav-item-devices').hasClass('nav-item-current')) {
        $('#progress')
        .css({
          'opacity' : 1,
          'z-index' : 1000
        })
        .find('h3')
        .text(hint ? hint : 'Loading...');
      }
    },
    hideProgress : function () {
      $('#progress').css({
        'opacity' : 0,
        'z-index' : -1
      });
    },
    addDevice : function (num) {
      var data = peers[num];
      var dom = $(Template['device-item']);
      dom.attr('id', 'device-' + num);
      dom.find('.device-icon').attr('src', '../public/img/' + data.type + '.png');
      dom.find('.device-name').text(data.name);
      dom.find('.device-ip').text(data.url.substring(7, data.url.indexOf(':12580')));
      dom.find('.device-send').click(this.selectFile);
      dom.find('.device-chat').click(this.chat);
      dom.appendTo('#device-list');
      Page.hideProgress();
    },
    removeDevice : function (num) {
      delete peers[num];
      $('#device-' + num).remove();
      if (sizeOf(peers) <= 0) {
        Page.showProgress('Searching For Devices...');
      }
    },
    updateProgress : function (target, percentage) {
      $('#device-' + target)
      .find('.device-progress-inner')
      .css('width', 200 * (percentage / 100) + 'px');
      $('#device-' + target)
      .find('.device-percentage')
      .text(percentage + '%');
    },
    updateName : function () {
      var name = $(this).val();
      $('#nav-user').text(name);
      storage.setLocalStorage('name', name);
    },
    setDirAsk : function () {
      storage.setLocalStorage('dirSet', 'ask');
    },
    setDirDefault : function () {
      if (storage.getLocalStorage('dir')) {
        storage.setLocalStorage('dirSet', 'default');
      } else {
        var dir = iconv.decode(execSync('.\\extensions\\SHBrowseForFolder.exe'),'GBK')
        if (dir == '') {
          alert('Please Select A Directory');
          $('#dir-ask').click();
        } else {
          storage.setLocalStorage('dirSet', 'default');
          storage.setLocalStorage('dir', dir);
          $('#dir-link').attr('title', dir);
        }
      }
    },
    updateDirDefault : function (e) {
      e.preventDefault();
      var dir = iconv.decode(execSync('.\\extensions\\SHBrowseForFolder.exe'),'GBK')
      if (dir == '') {
        alert('Failed To Update Download Directory');
      } else {
        $('#dir-link').attr('title', dir);
        storage.setLocalStorage('dir', dir);
      }
    },
    setDeleteKeep : function () {
      if (!$(this).attr('checked')) {
        storage.setLocalStorage('del', 'keep');
      } else {
        storage.setLocalStorage('del', 'remove');
      }
    },
    refreshReceived : function () {
      $('#received-list').html('');
      var items = storage.listReceived();
      for (var i in items) {
        var dom = $(Template['received-item']);
        dom.attr('path', items[i].path);
        dom.find('.received-name').text(items[i].name);
        dom.find('.received-size').text(Util.formatSize(items[i].size));
        dom.find('.received-time').text(Util.formatDate(items[i].time));
        dom.find('.received-icon').addClass(Util.detectFileIcon(items[i].type));
        dom.find('.received-delete').click(Page.deleteFile);
        $('#received-list').prepend(dom);
      }
      $('.received-item').on('click', this.openFile);
    },
    openFile : function () {
      var path = $(this).attr('path');
      exec('open ' + path, function (err, stdout, stderr) {
        if (err || stderr) {
          alert('Cannot Open:\n' + path + '\n\nFile May Be Moved Or Deleted');
        }
      });
    },
    deleteFile : function (e) {
      e.stopPropagation();
      var path = $(this).parent().attr('path');
      storage.deleteReceived(path);
      $(this).parent().slideUp(300);
    },
    selectFile : function (e) {
      e.stopPropagation();
      var num = $(this).parent().parent().attr('id').split('-').pop();
      var target = peers[num];
      var url,headUrl;
      if (target.type == 'ios') {
        url = target.url.replace(/:12580/, '') + 'upload';
      } else  {
        url = target.url + 'upload';
        headUrl = target.url+'uploadHead'
      }
      targetNum = num;
      targetUrl = url;
      targetHeadUrl = headUrl;
      $('#file').click();
    },
    chat : function (e) {
      e.stopPropagation();
      var num = $(this).parent().parent().attr('id').split('-').pop();
      var target = peers[num].url;
      var targetName = $(this).parent().parent().find('.device-name').text();
      var url = target + 'chat';
      var content = prompt('Enter Message For ' + targetName + ':');
      if (content && content.length > 0) {
        var from = 'from=' + storage.getLocalStorage('name');
        var content = 'content=' + content;
        var replyUrl = 'url=' + server.getBaseUrl() + 'chat';
        request(encodeURI(url + '?' + from + '&' + content + '&' + replyUrl));
      }
    },
    sendFile : function (e) {
      var file = e.target.files[0];
      if (file) {
        $('#device-' + targetNum)
        .find('.device-status')
        .removeClass('device-status-error device-status-success')
        .text('sending...');
        $('#device-' + targetNum)
        .find('.device-progress-outer')
        .css('display', 'inline-block');
        $('#device-' + targetNum)
        .find('.device-progress-inner')
        .css('width', '0px');
        if (targetUrl.indexOf(':12580') < 0) {
          Page.sendToIos(file);
        } else {
          Page.performSend(file);
        }
      }
    },
    sendToIos : function (file) {
      $('#iframe').attr('src', targetUrl.replace(/upload/, ''));
      $('#iframe').on('load', function () {
        var win = $('#iframe')[0].contentWindow;
        var progress = $(win.document).find('#progress')[0];
        win.startRequest(file, storage.getLocalStorage('name'));
        var interval = setInterval(function () {
          if (progress.value == '√' || progress.value == 'error') {
            clearInterval(interval);

            $('#device-' + targetNum)
            .find('.device-percentage')
            .text('');

            $('#device-' + targetNum)
            .find('.device-progress-outer')
            .hide();

            var remove = progress.value == 'error' ? 'device-status-success' : 'device-status-error';
            var add = progress.value == 'error' ? 'device-status-error' : 'device-status-success';
            $('#device-' + targetNum)
            .find('.device-status')
            .removeClass(remove)
            .addClass(add)
            .text(progress.value);
          } else {
            Page.updateProgress(targetNum, parseInt(progress.value));
          }
        }, 100);
      });
    },

    performSend : function (file) {
      var tot_err_this_sending=0;
      var fs = require('fs');

      var name=file.path.split('\\').pop()
      var lpath=file.path.substring(0,file.path.length-name.length)
      var hidenDirPath=lpath+'.'+name//without last'/'

      var N=0//total block num

      function emit(tot){
			  var fs = require('fs');

			  var data = {}
			  data.file = fs.createReadStream(hidenDirPath+'/'+name+'.'+tot);
			  data.name = file.name+'.'+tot;
			  data.size = fs.statSync(hidenDirPath+'/'+name+'.'+tot).size
			  data.type = file.type;
			  data.from = storage.getLocalStorage('name');

			  request.post({url : targetUrl, formData : data}, function (err, res, body) {

		      $('#device-' + targetNum)
		      .find('.device-percentage')
		      .text('');

		      $('#device-' + targetNum)
		      .find('.device-progress-outer')
		      .hide();

		      if (err || res.statusCode != 200) {
                tot_err_this_sending++;
                if(tot_err_this_sending>5){//if retry over 5 times
		          $('#device-' + targetNum)
		          .find('.device-status')
		          .removeClass('device-status-success')
		          .addClass('device-status-error')
		          .text('error');
		        }
		        else{
                  emit(tot);//resend
		        }
		      } else {//successfully emit 1 package
		        slicer.setSuccessBlock(file.path,tot+1);
		        if(tot+1!=N)//continue sending
		          emit(tot+1)
		        else{
		          $('#device-' + targetNum)
		          .find('.device-status')
		          .removeClass('device-status-error')
		          .addClass('device-status-success')
		          .text('√');
		        }
		      }
		    }).on('data', function (data) {
		      Page.updateProgress(targetNum, data.toString());
		    });
	 		}

      var ret=slicer.checkIsExistSending(file.path,targetUrl);
      curBlock=ret[0];
     	if(curBlock>=0){
     		N=ret[1];
    		emit(curBlock)//do resume
   		}
   		else{
      //do init
	      slicer.slice(file.path,function(N){
	        slicer.setTotalBlock(file.path,N,storage.getLocalStorage('name'),targetUrl);
	        
					var data = {}
				  data.file = fs.createReadStream(hidenDirPath+'\\'+name+'.download');
				  console.log(hidenDirPath+'\\'+name+'.download')
				  data.name = name+'.download'
				  data.size = fs.statSync(hidenDirPath+'\\'+name+'.download').size
				  data.type = file.type;
				  data.from = storage.getLocalStorage('name');

				  console.log(data.size+','+data.type+','+data.name+','+targetHeadUrl)

				  request.post({url : targetHeadUrl, formData : data}, function (err, res, body){
	        	if (err || res.statusCode != 200)
	        		console.log("headPost lost");
	        	else{
			    		emit(0);
			 			}
	        });
	      });
   	  }
    }
  };

  var Core = {
    init : function () {
      this.initServer();
      this.getIp();
    },
    initServer : function () {
      if (!storage.getLocalStorage('name')) {
        storage.setLocalStorage('name', prompt('Enter A Name For Your Device'));
      }
      server.start();
      this.searchDevice();
    },
    getIp : function () {
      for(var dev in interfaces){  
        var face = interfaces[dev];
        for (var i = 0; i < face.length; i++) {  
          var info = face[i];
          if (!info.internal && info.family === 'IPv4' && info.address !== '127.0.0.1') {
            prefix = info.address.substring(0, info.address.lastIndexOf('.') + 1);
            selfPrefix = parseInt(info.address.substring(info.address.lastIndexOf('.') + 1, info.address.length));
            return;
          }  
        }  
      }
    },
    searchDevice : function () {
      if (sizeOf(peers) <= 0) {
        Page.showProgress('Searching For Devices...');
      }
      var self = this;
      if (suffix >= 255) {
        suffix = 1;
      }
      for (var i = 0; i < 30; i++) {
        (function () {
          var num = suffix + i;
          request({
            method : 'GET',
            uri : 'http://' + prefix + num + ':12580/id',
            timeout : 3000
          }, function (err, res, body) {
            if (!err && res.statusCode == 200 && num != selfPrefix && !peers[num]) {
              peers[num] = JSON.parse(body);
              Page.addDevice(num);
            } else if (peers[num] && err) {
              Page.removeDevice(num);
            }
          });
        })();
      }
      setTimeout(function () {
        suffix += 30;
        self.searchDevice();
      }, 3000);
    }
  };

  var Util = {
    formatSize : function (size) {
      size = parseInt(size);
      if (size < 1000000) {
        return (size / 1000).toFixed(2) + ' KB';
      } else if (size < 1000000000) {
        return (size / 1000000).toFixed(2) + ' MB';
      } else {
        return (size / 1000000000).toFixed(2) + ' GB';
      }
    },
    formatDate : function (date) {
      var d = new Date(date);
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[d.getMonth()] + ' '
             + (d.getDate() < 10 ? '0' + d.getDate() : d.getDate()) + ', '
             + (d.getHours() < 10 ? '0' + d.getHours() : d.getHours()) + ':'
             + (d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes());
    },
    detectFileIcon : function (mime) {
      if (mime.indexOf('image') == 0) {
        return 'received-icon-image';
      } else if (mime.indexOf('audio' == 0)) {
        return 'received-icon-audio';
      }
    }
  }

  window.Interface = {
    refresh : function () {
      Page.refreshReceived();
    }
  }

})();