var fs=require('fs')

var blocksz=1024;

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
	for(var lptr=0;lptr<fsize;lptr+=blocksz){
		rptr=Math.min(lptr+blocksz,fsize)-1
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

exports.setSuccessBlock=function(path,num){//only invoke by uploaders(client)
	var name=path.split('\\').pop()
	var lpath=path.substring(0,path.length-name.length)
	var hidenDirPath=lpath+'.'+name//without last'/'

	var jObj={}
	try{
		var data=fs.readFileSync(hidenDirPath+'\\'+name+'.download')
		if(data!='')
			jObj=JSON.parse(data)
	}
	catch(ENOENT){

	}

	jObj.blockN=num
	console.log(jObj)
	fs.writeFileSync(hidenDirPath+'\\'+name+'.download',JSON.stringify(jObj))
	console.log("setSuccessBlockSuccessfully")
	
}

exports.setTotalBlock=function(path,num,srcName,dstUrl){//only invoke by uploaders(client)
	var name=path.split('\\').pop()
	var lpath=path.substring(0,path.length-name.length)
	var hidenDirPath=lpath+'.'+name//without last'/'

	var jObj={}

	jObj.blockTot=num
	jObj.blockN=0
	jObj.from=srcName
	jObj.to=dstName
	console.log(jObj)
	fs.writeFileSync(hidenDirPath+'\\'+name+'.download',JSON.stringify(jObj))
	console.log("setTotalBlockSuccessfully")

	return jboj;
}