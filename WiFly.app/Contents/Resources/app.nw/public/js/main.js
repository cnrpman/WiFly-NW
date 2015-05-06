(function () {

  var request = require('request'),
      exec = require('child_process').exec,
      execSync = require('child_process').execSync,
      interfaces = require('os').networkInterfaces();

  var server = require('../controllers/server'),
      storage = require('../controllers/storage');

  var peers = {};
  var prefix = '', suffix = 1, selfSuffix = 0;
  var targetNum, targetUrl;

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
      $('#file').on('change', this.performSend);
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
      dom.find('.device-send').click(this.sendFile);
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
        var dir = execSync('./extensions/DirectoryChooser.app/Contents/MacOS/DirectoryChooser', {encoding : 'utf-8'})
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
      var dir = execSync('./extensions/DirectoryChooser.app/Contents/MacOS/DirectoryChooser', {encoding : 'utf-8'})
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
    sendFile : function (e) {
      e.stopPropagation();
      var num = $(this).parent().parent().attr('id').split('-').pop();
      var target = peers[num];
      var url;
      if (target.type == 'ios') {
        url = target.url.replace(/:12580/, '') + 'upload';
      } else  {
        url = target.url + 'upload';
      }
      targetNum = num;
      targetUrl = url;
      $('#file').click();
    },
    performSend : function (e) {
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