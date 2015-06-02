var fs=require('fs'),
    crypto = require('crypto');

var storage = require('./storage');

var CHUNKSZ=1024;

exports.slice = function(path,callback){//[ Path of the file to slice ] -> Number of blocks
	console.log(path)
	var name=path.split('\\').pop()
	var lpath=path.substring(0,path.length-name.length)

	var hidenDirPath=lpath+'.'+name//without last'/'

	console.log(path+','+name+','+lpath)

	var fsize=(fs.statSync(path).size)

	try{
		fs.mkdirSync(hidenDirPath)
	}catch(EEXIST){
		console.log('dirExist')
	}

	var tot=0,counter=0;
	for(var lptr=0;lptr<fsize;lptr+=CHUNKSZ){
		rptr=Math.min(lptr+CHUNKSZ,fsize)-1
		var rstream = fs.createReadStream(path,{start:lptr,end:rptr});
		var wstream = fs.createWriteStream(hidenDirPath+'\\'+name+'.'+(tot++))
		wstream.on('close',function(){
			counter++;
			if(counter==tot)
				callback(tot)
		})
		rstream.pipe(wstream);
	}
}

exports.merge = function(lpath,name){//[ Path of the file to sav, Name of the file ] lpath has no lat '/'
	var path=lpath+'\\'+name
	var hidenDirPath=lpath+'\\.'+name//without last'/'


	var downObj=JSON.parse(fs.readFileSync(hidenDirPath+'\\'+name+'.download'));
	for(var tot=0;tot<downObj.blockN;tot++){
		var rstream = fs.createReadStream(hidenDirPath+'\\'+name+'.'+tot);
		var wstream = fs.createWriteStream(path+'.new',{flags:'a'})
		rstream.pipe(wstream);
	}
}

exports.getChunkNumFromSize = function(size){
	return Math.ceil(size / CHUNKSZ);
}

//sender(uploader) ONLY
exports.setSuccessChunk = function(md5,num){//current success seq+1, = the next chunk to be emit
	storage.setLocalStorage("upload_lstChunk_"+md5,num);
}

/*
exports.setTotalChunk = function(md5,num){
	storage.setLocalStorage("upload_totChunk_"+md5,num);
}
*/

exports.getSuccessChunk = function(md5){
	return storage.getLocalStorage("upload_totChunk_"+md5);
}

/*
exports.getTotalChunk = function(md5){
	return storage.getLocalStorage("upload_totChunk_"+md5);
}
*/

//receiver ONLY
exports.getTotalChunk_r = function(md5){
	return storage.getLocalStorage("download_totChunk_"+md5);
}

exports.getMD5fromFile = function(path,callback){//callback : function(md5){}
	var rs = fs.createReadStream(path);
    var hash = crypto.createHash('md5');
    rs.on('data',hash.update.bind(hash));
    rs.on('end',function(){
    	var md5=hash.digest('hex');
    	console.log("controllers/slicer::getMD5fromFile  path:"+path+" md5:"+md5);
    	callback(md5);
    });
}