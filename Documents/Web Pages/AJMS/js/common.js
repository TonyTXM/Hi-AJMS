function getCookie(name)
{
    var arr = document.cookie.match(new RegExp("(^| )"+name+"=([^;]*)(;|$)"));
    if(arr != null) return unescape(arr[2]); return null;
}
function setCookie(name,value)
{
    var Days = 30;
    var exp  = new Date();
    exp.setTime(exp.getTime() + Days*24*60*60*1000);
    document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString();
}
function getLocal(name)
{
    if(window.localStorage.getItem(name) == null) {
        return window.localStorage.getItem(name);
    }else {
        return decodeURIComponent(window.localStorage.getItem(name));
    }
    
}

function setLocal(name, value)
{
    window.localStorage.setItem(name, encodeURIComponent(value));
}

function getHistory()
{
    var tmp = "";
    var res = new Array;
    var splitChar = String.fromCharCode(1);
    if(window.localStorage){
        tmp = getLocal('search_history');
    } else {
        tmp = getCookie('search_history');
    }
    if (tmp != "" && tmp != null) {
        res = tmp.split(splitChar);
    }
    return res;
}

function setHistory()
{
    var searchval = $('#search_input').val();
    if (searchval == "") {
        return false;
    }
    var nowHistory = getHistory();
    var splitChar = String.fromCharCode(1);
    if (nowHistory.length == 0) {
        var nowHistory = new Array;
    }
    for (var i=0;i<nowHistory.length;i++) {
        if (nowHistory[i] == searchval) {
            nowHistory.splice(i,1);
        }
    }
    nowHistory.push(searchval);
    var tmp = nowHistory.slice(-12);
    var res = tmp.join(splitChar);
    if(window.localStorage){
        setLocal('search_history', res);
    } else {
        setCookie('search_history', res);
    }
}

function clearHistory()
{
    if(window.localStorage){
        window.localStorage.removeItem('search_history');
    } else {
        setCookie('search_history', '');
    }
}

var old = null;//å­˜å‚¨å‰ä¸€æ¬¡å‘éŸ³å¯¹è±¡
function displayAudio(c){
    var audio = document.createElement("audio");
    if(audio != null && audio.canPlayType && audio.canPlayType("audio/mpeg")){
        if(old){
            old.pause();//å¦‚æžœå¤šæ¬¡è§¦å‘å‘éŸ³ï¼Œåˆ™å…ˆåœæ­¢ä¸Šä¸€æ¬¡çš„å‘éŸ³
        }
        audio.src = c;
        old = audio;
        audio.play();
    }else{
        var asound = getFlashObject("asound");
        if(asound){
            try{
                asound.SetVariable("f",c);
                asound.GotoFrame(1);
            }catch(e){
            }
        }
    }
}

function getFlashObject(movieName) {
	if (window.document[movieName]) {
		return window.document[movieName];
	}
	if (navigator.appName.indexOf("Microsoft Internet")==-1) {
		if (document.embeds && document.embeds[movieName])
		return document.embeds[movieName];
	} else  {
		return document.getElementById(movieName);
	}
}

