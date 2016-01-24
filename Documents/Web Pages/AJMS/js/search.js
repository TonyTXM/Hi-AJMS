/**
* Iciba Suggest Client
* 
* now works with ie6/7, firefox2, opera
* about cache: currently using http client caching
*
* TODO: 
* 1 encoding(utf-8, gb, big5...) chinese, english, japanese...
* 2 event handling
* 3 keycode compatibility acrossing browers(ie firefox opera Safari)
*
*
* @version 1.5
* @updated 2007-10-08 ZhuXiaoming <ZhuXiaoming@kingsoft.com>
*/
var _index_suggest_left_off = 0;
var _index_suggest_width	= 17;
if (typeof(_index_suggest_left)!='undefined') {
	_index_suggest_left_off = 3;
	_index_suggest_width	= 20;
}

if (typeof ICIBA != 'object') {var ICIBA = {};}
ICIBA.$ = function(id) {
	return document.getElementById(id);
};
ICIBA.Ajax = ICIBA.Ajax || {};
ICIBA.Ajax.InitAjax = function() {
    var http_request = false;

    if (window.XMLHttpRequest) {
        try {
            http_request = new XMLHttpRequest();
            if (http_request.overrideMimeType) {
                http_request.overrideMimeType('text/xml');
            }
        } catch (e) {}
    } else if (window.ActiveXObject) {
        try {
            http_request = new ActiveXObject("Msxml2.XMLHTTP");
        } catch (e) {
            var MSXML = ['MSXML2.XMLHTTP.5.0', 'MSXML2.XMLHTTP.4.0', 'MSXML2.XMLHTTP.3.0', 'MSXML2.XMLHTTP', 'Microsoft.XMLHTTP'];
            for(var n = 0; n < MSXML.length; n ++) {
                try {
                    http_request = new ActiveXObject(MSXML[n]);
                    break;
                } catch(e) {}
            }
        }
    }
    return http_request;
};

if (typeof(String.prototype.trim) == 'undefined') {
    String.prototype.trim = function() {
        return this.replace(/(^\s*)|(\s*$)/g, "");
    };
};
if (typeof(String.prototype.stripTags) == 'undefined') {
    String.prototype.stripTags=function() {
        return this.replace(/<\/?[^>]+>/gi, '');
    };
};

ICIBA.Suggest = {
	_version: '1.5',
	_sugPower: true, /*bool, power on/off*/
	_sugInterface: "/index.php?c=search&a=suggestnew&s=",
	//_sugInterface: "getsug_cache.php?s=", /*suggest data interface*/
	_inputField: null, /*input field which installed suggest*/
	_userInput: null, /*string from user input*/
	_userLastInput: null, /*last input*/
	_xmlHttp: null, /*xmlhttp instance*/
	_sugForm: null, /*the form from which input locate*/
	_sugContainer: null, /*suggest panel div*/
	_sugSubContainer1: null, /*suggest container div*/
	_sugButton: null,
	_sugBottomBar: null, /*suggest panel bottom bar div*/
	_minInputChars: 1, /*minimal input charaters to start suggest*/
	_maxInputChars: 30, /*max input charaters to start suggest*/
	_sugDelay: 10, /*millisecond to delay to start suggest after user typing, to make sure we give suggest when user stopped typing */
	_sugDelayTimer: null, /*the delay timer object*/
	_sugSize: 0, /*the number of suggest items*/
	_sugSizeMax: 10, /*the number of suggest items to display*/
	_numItemsInBox: 0,
	_sugInViewSizeMax: 10, /*the number of suggest items to display*/
	_currentItem: null, /*current hightlighted suggest item*/
	_userAgent: null /*the brower app name and version*/
};

ICIBA.Suggest.Rand = function (num) {
	return Math.floor(Math.random()*num)+1;
};

/**
* set cookie
*/
ICIBA.Suggest.WriteCookie = function(name, value, hours, domain, path) {
	var expire = ""; 
	if(hours != null) { 
		expire = new Date((new Date()).getTime() + hours * 3600000); 
		expire = "; expires=" + expire.toGMTString(); 
		if (domain) domain = "; domain=" + domain;
		if (path) path = "; path=" + path;
	}
	document.cookie = name + "=" + escape(value) + expire + domain + path; 
};

/**
* read cookie
*/
ICIBA.Suggest.ReadCookie = function(name) {
	var cookieValue = ""; 
	var search = name + "=";
	if(document.cookie.length > 0) { 
		offset = document.cookie.indexOf(search); 
		if (offset != -1) { 
			offset += search.length; 
			end = document.cookie.indexOf(";", offset); 
			if (end == -1) {
				end = document.cookie.length;
			}
			cookieValue = unescape(document.cookie.substring(offset, end)) 
		}
	}
	return cookieValue; 
};

ICIBA.Suggest.PanelToggle = function(event) {
	//ICIBA.Suggest._sugButton.innerHTML = "";
	var e = event || window.event;
	ICIBA.Suggest.PreventClose(e);
	if (ICIBA.Suggest.GetShowStatus()) {
		ICIBA.Suggest.Hide();
	} else {
		if ('' != ICIBA.Suggest._inputField.value.trim() && ICIBA.Suggest._sugPower && !ICIBA.Suggest._sugSize) {
			ICIBA.Suggest.Query();
			ICIBA.Suggest.Show();
		} else {
			ICIBA.Suggest.Show();
		}
	}
};

/**
* power on/off
*/
ICIBA.Suggest.PowerSwitch = function(powerSpec, isQuery) {
	var whost = document.location.domain;
	if ('boolean' != typeof powerSpec) {powerSpec = ICIBA.Suggest._sugPower;}
	if (powerSpec) {
		ICIBA.Suggest._sugPower = false;
		ICIBA.Suggest.WriteCookie('iciba_suggest_power', '0', 8760, whost, '/');
		ICIBA.Suggest.Hide();
		ICIBA.Suggest.Init(false);
	} else {
		ICIBA.Suggest._sugPower = true;
		ICIBA.Suggest.WriteCookie('iciba_suggest_power', '1', 8760, whost, '/');
		ICIBA.Suggest.Init(true);
		if ('' != ICIBA.Suggest._inputField.value.trim() && isQuery) {
			ICIBA.Suggest.Query();
		}
	}
};

/*
* ui init
*/
ICIBA.Suggest.Init = function(powerSpec) {
	ICIBA.Suggest._userInput = '';
	ICIBA.Suggest._userLastInput = '';
	ICIBA.Suggest._sugSize = 0;
	if (powerSpec) {
		//ICIBA.Suggest._sugBottomBar.innerHTML = '<p><a href="javascript:;" onclick="ICIBA.Suggest.PowerSwitch(null, true);">å…³é—­æç¤ºåŠŸèƒ½</a></p>';
		ICIBA.Suggest._sugSubContainer1.innerHTML = '<div style="padding:5px;"><div style="font-size:14px;font-weight:bold;">æŸ¥è¯å»ºè®®</div><div style="margin-top:5px;">åœ¨æŸ¥è¯æ¡†ä¸­è¾“å…¥å…³é”®å­—ï¼Œå³ä¼šåœ¨æ­¤å¤„å‡ºçŽ°ç›¸åº”çš„æç¤ºã€‚</div></div>';
	} else {
		//ICIBA.Suggest._sugBottomBar.innerHTML = '<p><a href="javascript:;" onclick="ICIBA.Suggest.PowerSwitch(null, true);">å¼€å¯æç¤ºåŠŸèƒ½</a></p>';
		ICIBA.Suggest._sugSubContainer1.innerHTML = '<div style="padding:5px;"><div style="font-size:14px;font-weight:bold;">æŸ¥è¯å»ºè®®</div><div style="margin-top:5px;">æç¤ºåŠŸèƒ½å·²å…³é—­ï¼Œè¯·å¼€å¯åŽä½¿ç”¨ã€‚</div></div>';
	}
};

/**
* init
*/
ICIBA.Suggest.Install = function(inputId, defaultPowerStatus, formId, sugDivId) {
	var whost = document.location.domain;
	//if (-1 == whost.indexOf('iciba.com')) return;
	var cfgSugPower = ICIBA.Suggest.ReadCookie('iciba_suggest_power');
	if ('0' != cfgSugPower && '1' != cfgSugPower) {
		ICIBA.Suggest._sugPower = defaultPowerStatus ? true : false;
	} else {
		ICIBA.Suggest._sugPower = ('1' == cfgSugPower) ? true : false;
	}
	ICIBA.Suggest.WriteCookie('iciba_suggest_power', (ICIBA.Suggest._sugPower ? '1' : '0'), 8760, whost, '/');

	var userAgent = navigator.userAgent.toLowerCase();
	if (userAgent.indexOf('msie') != -1) ICIBA.Suggest._userAgent = 'ie';
	if (userAgent.indexOf('gecko') != -1) ICIBA.Suggest._userAgent = 'gecko';
	if (userAgent.indexOf('opera') != -1) ICIBA.Suggest._userAgent = 'opera';

	ICIBA.Suggest._sugForm = ICIBA.$(formId);
	ICIBA.Suggest._inputField = ICIBA.$(inputId);
	ICIBA.Suggest._inputField.autocomplete = "off";
	ICIBA.Suggest._inputField.setAttribute("autocomplete", "off");
	ICIBA.Suggest._userInput = ICIBA.Suggest._inputField.value.replace(/^\s+/g, '');

	ICIBA.Suggest._sugToggle = ICIBA.$('icibaSugToggle'); // toggle of the panel show or hide

	//ICIBA.Suggest._sugContainer = document.createElement("div");
	ICIBA.Suggest._sugContainer = ICIBA.$(sugDivId);
	//ICIBA.Suggest.SetOffsets();
	//ICIBA.Suggest.Hide();
	ICIBA.Suggest._sugContainer.innerHTML = '<div id="icibaSugContent"></div><div id="icibaSugBottom"></div>';
	
	ICIBA.Suggest._sugSubContainer1 = ICIBA.$('icibaSugContent');
	//ICIBA.Suggest._sugButton = ICIBA.$('icibaSugButton');
	ICIBA.Suggest._sugBottomBar = ICIBA.$('icibaSugBottom');
	//ICIBA.Suggest.Init(ICIBA.Suggest._sugPower);

	ICIBA.Suggest._xmlHttp = ICIBA.Ajax.InitAjax();
	ICIBA.Suggest._inputField.onkeyup = ICIBA.Suggest.InputOnKeyup;
	ICIBA.Suggest._inputField.onkeydown = ICIBA.Suggest.InputOnKeydown;

	/*
	* close when click out of suggest
	*/
	if ('ie' == ICIBA.Suggest._userAgent) {
		document.attachEvent("onclick", ICIBA.Suggest.SugOnBlur);
	} else {
		document.addEventListener("click", ICIBA.Suggest.SugOnBlur, false);
	}

	/*
	* these places should be considered part of suggest
	*/
	if ('ie' == ICIBA.Suggest._userAgent) {
		ICIBA.Suggest._sugContainer.attachEvent("onclick", ICIBA.Suggest.PreventClose);
		ICIBA.Suggest._inputField.attachEvent("onclick", ICIBA.Suggest.PreventClose);
	} else {
		ICIBA.Suggest._sugContainer.addEventListener("click", ICIBA.Suggest.PreventClose, false);
		ICIBA.Suggest._inputField.addEventListener("click", ICIBA.Suggest.PreventClose, false);
	}

	window.onresize = function() {
		if (ICIBA.Suggest.GetShowStatus()) {
			ICIBA.Suggest.Show();
		}
	};
};

ICIBA.Suggest.SugOnBlur = function (event) {
	if (ICIBA.Suggest._sugDelayTimer) clearTimeout(ICIBA.Suggest._sugDelayTimer);
	ICIBA.Suggest.Hide();
};
ICIBA.Suggest.PreventClose = function (event) {
	var e = event || window.event;
	if ('ie' == ICIBA.Suggest._userAgent) {
		e.cancelBubble = true;
		//e.returnValue = true;
	} else {
		e.stopPropagation();
		//e.preventDefault();
	}
};

/**
* get suggest, pickup suggest with enter
*/
ICIBA.Suggest.InputOnKeyup = function (event) {
	//if (ICIBA.Suggest._sugDelayTimer != 0) clearTimeout(ICIBA.Suggest._sugDelayTimer);
	var showStatus = ICIBA.Suggest.GetShowStatus();
	var e = event || window.event;
	var eventKey = e.charCode || e.keyCode;

	/* start suggest: for letter/number/backspace/blank/enter only, and determine whether the input is done with chinese */
	/*
	* 8 backspace
	* 32 blank
	* 46 delete
	* 16 shift(when input +)
	* + firefox 61/107, ie 187/107, opera 61/43
	* - firefox 109/109, ie 189/109, opera 45/45
	* / firefox 191/111, ie 191/111, opera 47/47
	*/
	if (((eventKey >= 48 && eventKey <= 57) 
		|| (eventKey >= 65 && eventKey <= 90) 
		|| 61 == eventKey || 107 == eventKey || 187 == eventKey || 43 == eventKey 
		|| 109 == eventKey || 189 == eventKey || 45 == eventKey 
		|| 191 == eventKey  || 111 == eventKey || 47 == eventKey 
		|| 8 == eventKey 
		|| 32 == eventKey 
		|| 46 == eventKey
	) && ICIBA.Suggest._userLastInput != ICIBA.Suggest._inputField.value && ICIBA.Suggest._sugPower) {
        
		if ('' == ICIBA.Suggest._inputField.value.trim()) {
			ICIBA.Suggest.Hide();
            //console.log('hello power');
			ICIBA.Suggest.Init(ICIBA.Suggest._sugPower);
		} else {
			ICIBA.Suggest.Query();
		}
	}

	/* 
	* upward arrow
	* hide suggest
	*/
	if (38 == eventKey) {
		if (showStatus && !ICIBA.Suggest._sugSize) {
			ICIBA.Suggest.Hide();
		}
	}

	/*
	* downward arrow
	* display suggest if the suggest is hidden
	*/
	if (40 == eventKey) {
		if (!showStatus) {
			if ('' != ICIBA.Suggest._inputField.value.trim() && ICIBA.Suggest._sugPower) {
				ICIBA.Suggest.Query();
			} else {
				ICIBA.Suggest.Show();
			}
		}
	}

	/* 
	* Enter to pickup suggest
	* 13 enter
	*/
	if (13 == eventKey && ICIBA.Suggest._sugSize > 0 && ICIBA.Suggest._sugPower) {
		if (showStatus) {
			if (ICIBA.Suggest._currentItem) ICIBA.Suggest.ItemOnSelect(ICIBA.Suggest._currentItem);
			ICIBA.Suggest.Hide();
            window.location.href = "http://"+window.location.host+"/"+document.getElementById('search_input').value;
			//ICIBA.Suggest.Clear();
			return false;
		}
	}
};
/**
* scrolling up/down continually 
*/
ICIBA.Suggest.InputOnKeydown = function (event) {
	if (!ICIBA.Suggest._sugPower) return;
	var showStatus = ICIBA.Suggest.GetShowStatus();
	var e = event || window.event;
	var eventKey = e.charCode || e.keyCode;
	/* 
	* scroll up
	*/
	if (38 == eventKey) {
		if (showStatus && ICIBA.Suggest._sugSize > 0) {
			ICIBA.Suggest.InputOnScrollup();
			ICIBA.Suggest.ItemOnSelect(ICIBA.Suggest._currentItem);
		}
	}
	/* 
	* scroll down
	*/
	if (40 == eventKey) {
		if (showStatus && ICIBA.Suggest._sugSize > 0) {
			ICIBA.Suggest.InputOnScrolldown();
			ICIBA.Suggest.ItemOnSelect(ICIBA.Suggest._currentItem);
		}
	}
};

/**
* scroll up
*
* 1 åˆšåˆšåˆå§‹åŒ–ï¼Œæ²¡æœ‰å½“å‰èŠ‚ç‚¹
* 2 å½“å‰èŠ‚ç‚¹ä¸ºç¬¬ä¸€ä¸ªèŠ‚ç‚¹
* 3 å½“å‰èŠ‚ç‚¹ä¸æ˜¯ç¬¬ä¸€ä¸ªèŠ‚ç‚¹
*/
ICIBA.Suggest.InputOnScrollup = function () {
	var lastItem = null;
	if (null == ICIBA.Suggest._currentItem) {
		ICIBA.Suggest._currentItem = ICIBA.Suggest._sugSubContainer1.firstChild.lastChild;
	} else if (ICIBA.Suggest._currentItem == ICIBA.Suggest._sugSubContainer1.firstChild.firstChild) {
		lastItem = ICIBA.Suggest._currentItem;
		ICIBA.Suggest._currentItem = null;
	} else {
		lastItem = ICIBA.Suggest._currentItem;
		ICIBA.Suggest._currentItem = ICIBA.Suggest._currentItem.previousSibling;
	}
	if (lastItem) ICIBA.Suggest.ItemHighlight(lastItem, false);
	if (ICIBA.Suggest._currentItem) ICIBA.Suggest.ItemHighlight(ICIBA.Suggest._currentItem, true);
};

/**
* scroll down
*
*/
ICIBA.Suggest.InputOnScrolldown = function () {
	var lastItem = null;
	if (null == ICIBA.Suggest._currentItem) {
		ICIBA.Suggest._currentItem = ICIBA.Suggest._sugSubContainer1.firstChild.firstChild;
	} else if (ICIBA.Suggest._currentItem == ICIBA.Suggest._sugSubContainer1.firstChild.lastChild) {
		lastItem = ICIBA.Suggest._currentItem;
		ICIBA.Suggest._currentItem = null;
	} else {
		lastItem = ICIBA.Suggest._currentItem;
		ICIBA.Suggest._currentItem = ICIBA.Suggest._currentItem.nextSibling;
	}
	if (lastItem) ICIBA.Suggest.ItemHighlight(lastItem, false);
	if (ICIBA.Suggest._currentItem) ICIBA.Suggest.ItemHighlight(ICIBA.Suggest._currentItem, true);
};

ICIBA.Suggest.Query = function () {
	/*
	* due to bug of maxthon 1.x, we have to put clearTimeout here but not in ICIBA.Suggest.InputOnKeyup
	* otherwise setTimeout wont be invoked
	*/
	if (ICIBA.Suggest._sugDelayTimer) clearTimeout(ICIBA.Suggest._sugDelayTimer);
	//ICIBA.Suggest.Hide();
	ICIBA.Suggest._userInput = ICIBA.Suggest._inputField.value.replace(/^\s+/g, '');
	ICIBA.Suggest._userLastInput = ICIBA.Suggest._userInput;
	if (ICIBA.Suggest._userInput.length >= ICIBA.Suggest._minInputChars && ICIBA.Suggest._userInput.length <= ICIBA.Suggest._maxInputChars && ICIBA.Suggest._userInput != '') {
		ICIBA.Suggest._sugDelayTimer = setTimeout(ICIBA.Suggest.Start, ICIBA.Suggest._sugDelay);
        
		return true;
	} else {
		ICIBA.Suggest._sugSize = 0;
		return false;
	}
};

/**
* sending request to server
*/
ICIBA.Suggest.Start = function () {
	var input4q = ICIBA.Suggest._userInput;
	input4q = input4q.replace(/\s+/g, '|1{');
	input4q = input4q.replace(/\+/g, '|2{');
	input4q = input4q.replace(/-/g, '|3{');
	input4q = input4q.replace(/\//g, '|4{');
	ICIBA.Suggest._xmlHttp.open("GET", ICIBA.Suggest._sugInterface + encodeURIComponent(input4q), true);
	ICIBA.Suggest._xmlHttp.onreadystatechange = ICIBA.Suggest.GetSuggestData;
	ICIBA.Suggest._xmlHttp.setRequestHeader('Connection', 'close');
	ICIBA.Suggest._xmlHttp.send(null);
};

/**
* parse the suggest data
*/
ICIBA.Suggest.GetSuggestData = function () {
	if (ICIBA.Suggest._xmlHttp.readyState == 4) {
		if (ICIBA.Suggest._xmlHttp.status == 200 && ICIBA.Suggest._xmlHttp.responseText.length > 0) {
			var xmlhttpres = ICIBA.Suggest._xmlHttp.responseText.trim();
			xmlhttpres = xmlhttpres.replace(/\|1\{/gm, ' ');
			xmlhttpres = xmlhttpres.replace(/\|2\{/gm, '+');
			xmlhttpres = xmlhttpres.replace(/\|3\{/gm, '-');
			xmlhttpres = xmlhttpres.replace(/\|4\{/gm, '/');
			xmlhttpres = xmlhttpres.replace(/_/gm, "\t");
			if (xmlhttpres.indexOf("\n")) {
				xmlhttpres = xmlhttpres.split("\n");
				ICIBA.Suggest._sugSize = xmlhttpres.length;
				if (ICIBA.Suggest._sugSize > 0) {
                    
					ICIBA.Suggest.Display(xmlhttpres);
				}
			} else if ('' != xmlhttpres) {
				xmlhttpres = [xmlhttpres];
				ICIBA.Suggest.Display(xmlhttpres);
			}
		}
	}
};

/**
* display the suggest
*/
ICIBA.Suggest.Display = function (suggests) {
	// iciba_shouxie_close();
	suggests = JSON.parse(suggests[0]);
	suggests = suggests['message'];
	if (suggests == "" || suggests == "undefined") {
		return;
	}
	var item = null;
	ICIBA.Suggest._numItemsInBox = (ICIBA.Suggest._sugSize > ICIBA.Suggest._sugSizeMax) ?  ICIBA.Suggest._sugSizeMax : ICIBA.Suggest._sugSize;
	ICIBA.Suggest.Clear();
	var pitem = document.createElement("ul");
	
	for (var i = 0; i < suggests.length; i++) {
		item = document.createElement("li");
		item.sugItemId = i;
		var means = '';
		var pattern4HighLight = new RegExp("^"+ICIBA.Suggest._userInput.replace(/(\||\{)/g, "\\$1"), "i");
		if(suggests[i] == undefined) {
			continue;
		}
		item.sugData = suggests[i]['key'].stripTags();
		//å¾ªçŽ¯å–å‡ºæ‰€æœ‰è¯æ€§åŠè¯ä¹‰
		for(var j = 0; j < suggests[i]['means'].length; j++) {
			var means = means + suggests[i]['means'][j]['part'] + suggests[i]['means'][j]['means'];
		}
		item.innerHTML = '<p><span class="search-english">' + suggests[i]['key'] + '</span>' + '<span class="search-chinese">' + means + '</span></p>';
		item.className = '';
		item.onmouseover = ICIBA.Suggest.ItemOnMouseover;
		item.onmouseout = ICIBA.Suggest.ItemOnMouseout;
		item.onclick = ICIBA.Suggest.ItemOnClick;
		pitem.appendChild(item);
	}

	ICIBA.Suggest._sugSubContainer1.appendChild(pitem);

	/*
	if (ICB._module == 1) {
		var sugButtonStr = '<div class="pull_button"><button onmouseout="this.className=\'search\'" onmouseover="this.className=\'search search_hover\'"  type="submit" onclick="search_word();" class="search"></button><button onmouseout="this.className=\'search search_web\'" onmouseover="this.className=\'search search_web_hover\'" type="button" class="search search_web" onclick="baiduSearch();"></button></div>';
		ICIBA.Suggest._sugButton.innerHTML = sugButtonStr;
	}
	*/

	ICIBA.Suggest._currentItem = null;
	/*fix ie on _sugContainer border dispaly*/
	ICIBA.Suggest.Show();
};

/**
* when mouse over the suggest items
*/
ICIBA.Suggest.ItemOnMouseover = function (event) {
	/* mouseover after scroll and mouse is not in suggest area*/
	if (ICIBA.Suggest._currentItem) ICIBA.Suggest.ItemHighlight(ICIBA.Suggest._currentItem, false);
	//ICIBA.Suggest.ItemOnSelect(this);
	ICIBA.Suggest._currentItem = this;
	ICIBA.Suggest.ItemHighlight(this, true);
};

/**
* when mouse out the suggest items
*/
ICIBA.Suggest.ItemOnMouseout = function (event) {
	/* mouseover after scroll and mouse is inside suggest area*/
	if (ICIBA.Suggest._currentItem) ICIBA.Suggest.ItemHighlight(ICIBA.Suggest._currentItem, false);
	//ICIBA.Suggest.ItemOnSelect(null);
	ICIBA.Suggest._currentItem = null;
	ICIBA.Suggest.ItemHighlight(this, false);
};

/**
* click to pickup suggest
*/
ICIBA.Suggest.ItemOnClick = function (event) {
	ICIBA.Suggest.ItemOnSelect(this);
	//ICIBA.Suggest._sugForm.submit();
    window.location.href = "http://"+window.location.host+"/"+document.getElementById('search_input').value;
};

/**
* put the suggest in right place
*/
ICIBA.Suggest.SetOffsets = function () {
	ICIBA.Suggest._sugContainer.style.left = (ICIBA.Suggest.GetOffsetLeft(ICIBA.Suggest._inputField)-_index_suggest_left_off) + "px";
	ICIBA.Suggest._sugContainer.style.top = (ICIBA.Suggest.GetOffsetTop(ICIBA.Suggest._inputField) + ICIBA.Suggest._inputField.offsetHeight -2) + "px";
};

ICIBA.Suggest.GetOffsetLeft = function (node) {
	return ICIBA.Suggest.GetOffset(node, "offsetLeft");
};
ICIBA.Suggest.GetOffsetTop = function (node) {
	return ICIBA.Suggest.GetOffset(node, "offsetTop");
};
ICIBA.Suggest.GetOffset = function (node, attr) {
	var offset = 0;
	while(node) {
		offset += node[attr];
		node = node.offsetParent;
	}
	return offset;
};

/**
* pickup suggest to take place of the keywords inputed by user 
*/
ICIBA.Suggest.ItemOnSelect = function (item) {
	if (item) {
		ICIBA.Suggest._inputField.value = item.sugData;
	} else {
		ICIBA.Suggest._inputField.value = ICIBA.Suggest._userInput;
	}
};

/**
* select the part we suggest out of the keywords inputed by user 
*/
ICIBA.Suggest.SugSelectPart = function () {};

/**
* clear up suggest
*/
ICIBA.Suggest.Clear = function () {
	//if (ICIBA.Suggest._sugDelayTimer != 0) clearTimeout(ICIBA.Suggest._sugDelayTimer);
	ICIBA.Suggest._sugSubContainer1.innerHTML = '';
};
/**
* show the suggest
*/
ICIBA.Suggest.Show = function () {
	ICIBA.Suggest._sugContainer.style.visibility = 'visible';
};
/**
* hide the suggest
*/
ICIBA.Suggest.Hide = function () {
	ICIBA.Suggest._sugContainer.style.visibility = 'hidden';
};
/**
* get the show status of suggest 
*/
ICIBA.Suggest.GetShowStatus = function () {
	return ('visible' == ICIBA.Suggest._sugContainer.style.visibility ? true : false);
};

/**
* highlight the suggest item when it is on focus(mouse over/scroll to)
*/
ICIBA.Suggest.ItemHighlight = function (item, isHighlight) {
	if (isHighlight) {
		item.className = 'bg_blue';
	} else {
		item.className = '';
	}
};
