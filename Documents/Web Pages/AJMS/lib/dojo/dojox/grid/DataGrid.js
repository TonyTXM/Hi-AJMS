//>>built
define("dojox/grid/DataGrid",["../main","dojo/_base/array","dojo/_base/lang","dojo/_base/json","dojo/_base/sniff","dojo/_base/declare","./_Grid","./DataSelection","dojo/_base/html"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9){
var _a=_6("dojox.grid.DataGrid",_7,{store:null,query:null,queryOptions:null,fetchText:"...",sortFields:null,updateDelay:1,items:null,_store_connects:null,_by_idty:null,_by_idx:null,_cache:null,_pages:null,_pending_requests:null,_bop:-1,_eop:-1,_requests:0,rowCount:0,_isLoaded:false,_isLoading:false,keepSelection:false,postCreate:function(){
this._pages=[];
this._store_connects=[];
this._by_idty={};
this._by_idx=[];
this._cache=[];
this._pending_requests={};
this._setStore(this.store);
this.inherited(arguments);
},destroy:function(){
this.selection.destroy();
this.inherited(arguments);
},createSelection:function(){
this.selection=new _8(this);
},get:function(_b,_c){
if(_c&&this.field=="_item"&&!this.fields){
return _c;
}else{
if(_c&&this.fields){
var _d=[];
var s=this.grid.store;
_2.forEach(this.fields,function(f){
_d=_d.concat(s.getValues(_c,f));
});
return _d;
}else{
if(!_c&&typeof _b==="string"){
return this.inherited(arguments);
}
}
}
return (!_c?this.defaultValue:(!this.field?this.value:(this.field=="_item"?_c:this.grid.store.getValue(_c,this.field))));
},_checkUpdateStatus:function(){
if(this.updateDelay>0){
var _e=false;
if(this._endUpdateDelay){
clearTimeout(this._endUpdateDelay);
delete this._endUpdateDelay;
_e=true;
}
if(!this.updating){
this.beginUpdate();
_e=true;
}
if(_e){
var _f=this;
this._endUpdateDelay=setTimeout(function(){
delete _f._endUpdateDelay;
_f.endUpdate();
},this.updateDelay);
}
}
},_onSet:function(_10,_11,_12,_13){
this._checkUpdateStatus();
var idx=this.getItemIndex(_10);
if(idx>-1){
this.updateRow(idx);
}
},_createItem:function(_14,_15){
var _16=this._hasIdentity?this.store.getIdentity(_14):_4.toJson(this.query)+":idx:"+_15+":sort:"+_4.toJson(this.getSortProps());
var o=this._by_idty[_16]={idty:_16,item:_14};
return o;
},_addItem:function(_17,_18,_19){
this._by_idx[_18]=this._createItem(_17,_18);
if(!_19){
this.updateRow(_18);
}
},_onNew:function(_1a,_1b){
this._checkUpdateStatus();
var _1c=this.get("rowCount");
this._addingItem=true;
this.updateRowCount(_1c+1);
this._addingItem=false;
this._addItem(_1a,_1c);
this.showMessage();
},_onDelete:function(_1d){
this._checkUpdateStatus();
var idx=this._getItemIndex(_1d,true);
if(idx>=0){
this._pages=[];
this._bop=-1;
this._eop=-1;
var o=this._by_idx[idx];
this._by_idx.splice(idx,1);
delete this._by_idty[o.idty];
this.updateRowCount(this.get("rowCount")-1);
if(this.get("rowCount")===0){
this.showMessage(this.noDataMessage);
}
}
if(this.selection.isSelected(idx)){
this.selection.deselect(idx);
this.selection.selected.splice(idx,1);
}
},_onRevert:function(){
this._refresh();
},setStore:function(_1e,_1f,_20){
if(this._requestsPending(0)){
return;
}
this._setQuery(_1f,_20);
this._setStore(_1e);
this._refresh(true);
},setQuery:function(_21,_22){
if(this._requestsPending(0)){
return;
}
this._setQuery(_21,_22);
this._refresh(true);
},setItems:function(_23){
this.items=_23;
this._setStore(this.store);
this._refresh(true);
},_setQuery:function(_24,_25){
this.query=_24;
this.queryOptions=_25||this.queryOptions;
},_setStore:function(_26){
if(this.store&&this._store_connects){
_2.forEach(this._store_connects,this.disconnect,this);
}
this.store=_26;
if(this.store){
var f=this.store.getFeatures();
var h=[];
this._canEdit=!!f["dojo.data.api.Write"]&&!!f["dojo.data.api.Identity"];
this._hasIdentity=!!f["dojo.data.api.Identity"];
if(!!f["dojo.data.api.Notification"]&&!this.items){
h.push(this.connect(this.store,"onSet","_onSet"));
h.push(this.connect(this.store,"onNew","_onNew"));
h.push(this.connect(this.store,"onDelete","_onDelete"));
}
if(this._canEdit){
h.push(this.connect(this.store,"revert","_onRevert"));
}
this._store_connects=h;
}
},_onFetchBegin:function(_27,req){
if(!this.scroller){
return;
}
if(this.rowCount!=_27){
if(req.isRender){
this.scroller.init(_27,this.keepRows,this.rowsPerPage);
this.rowCount=_27;
this._setAutoHeightAttr(this.autoHeight,true);
this._skipRowRenormalize=true;
this.prerender();
this._skipRowRenormalize=false;
}else{
this.updateRowCount(_27);
}
}
if(!_27){
this.views.render();
this._resize();
this.showMessage(this.noDataMessage);
this.focus.initFocusView();
}else{
this.showMessage();
}
},_onFetchComplete:function(_28,req){
if(!this.scroller){
return;
}
if(_28&&_28.length>0){
_2.forEach(_28,function(_29,idx){
this._addItem(_29,req.start+idx,true);
},this);
this.updateRows(req.start,_28.length);
if(req.isRender){
this.setScrollTop(0);
this.postrender();
}else{
if(this._lastScrollTop){
this.setScrollTop(this._lastScrollTop);
}
}
if(_5("ie")){
_9.setSelectable(this.domNode,this.selectable);
}
}
delete this._lastScrollTop;
if(!this._isLoaded){
this._isLoading=false;
this._isLoaded=true;
}
this._pending_requests[req.start]=false;
},_onFetchError:function(err,req){
delete this._lastScrollTop;
if(!this._isLoaded){
this._isLoading=false;
this._isLoaded=true;
this.showMessage(this.errorMessage);
}
this._pending_requests[req.start]=false;
this.onFetchError(err,req);
},onFetchError:function(err,req){
},_fetch:function(_2a,_2b){
_2a=_2a||0;
if(this.store&&!this._pending_requests[_2a]){
if(!this._isLoaded&&!this._isLoading){
this._isLoading=true;
this.showMessage(this.loadingMessage);
}
this._pending_requests[_2a]=true;
try{
if(this.items){
var _2c=this.items;
var _2d=this.store;
this.rowsPerPage=_2c.length;
var req={start:_2a,count:this.rowsPerPage,isRender:_2b};
this._onFetchBegin(_2c.length,req);
var _2e=0;
_2.forEach(_2c,function(i){
if(!_2d.isItemLoaded(i)){
_2e++;
}
});
if(_2e===0){
this._onFetchComplete(_2c,req);
}else{
var _2f=function(_30){
_2e--;
if(_2e===0){
this._onFetchComplete(_2c,req);
}
};
_2.forEach(_2c,function(i){
if(!_2d.isItemLoaded(i)){
_2d.loadItem({item:i,onItem:_2f,scope:this});
}
},this);
}
}else{
this.store.fetch({start:_2a,count:this.rowsPerPage,query:this.query,sort:this.getSortProps(),queryOptions:this.queryOptions,isRender:_2b,onBegin:_3.hitch(this,"_onFetchBegin"),onComplete:_3.hitch(this,"_onFetchComplete"),onError:_3.hitch(this,"_onFetchError")});
}
}
catch(e){
this._onFetchError(e,{start:_2a,count:this.rowsPerPage});
}
}
},_clearData:function(){
this.updateRowCount(0);
this._by_idty={};
this._by_idx=[];
this._pages=[];
this._bop=this._eop=-1;
this._isLoaded=false;
this._isLoading=false;
},getItem:function(idx){
var _31=this._by_idx[idx];
if(!_31||(_31&&!_31.item)){
this._preparePage(idx);
return null;
}
return _31.item;
},getItemIndex:function(_32){
return this._getItemIndex(_32,false);
},_getItemIndex:function(_33,_34){
if(!_34&&!this.store.isItem(_33)){
return -1;
}
var _35=this._hasIdentity?this.store.getIdentity(_33):null;
for(var i=0,l=this._by_idx.length;i<l;i++){
var d=this._by_idx[i];
if(d&&((_35&&d.idty==_35)||(d.item===_33))){
return i;
}
}
return -1;
},filter:function(_36,_37){
this.query=_36;
if(_37){
this._clearData();
}
this._fetch();
},_getItemAttr:function(idx,_38){
var _39=this.getItem(idx);
return (!_39?this.fetchText:this.store.getValue(_39,_38));
},_render:function(){
if(this.domNode.parentNode){
this.scroller.init(this.get("rowCount"),this.keepRows,this.rowsPerPage);
this.prerender();
this._fetch(0,true);
}
},_requestsPending:function(_3a){
return this._pending_requests[_3a];
},_rowToPage:function(_3b){
return (this.rowsPerPage?Math.floor(_3b/this.rowsPerPage):_3b);
},_pageToRow:function(_3c){
return (this.rowsPerPage?this.rowsPerPage*_3c:_3c);
},_preparePage:function(_3d){
if((_3d<this._bop||_3d>=this._eop)&&!this._addingItem){
var _3e=this._rowToPage(_3d);
this._needPage(_3e);
this._bop=_3e*this.rowsPerPage;
this._eop=this._bop+(this.rowsPerPage||this.get("rowCount"));
}
},_needPage:function(_3f){
if(!this._pages[_3f]){
this._pages[_3f]=true;
this._requestPage(_3f);
}
},_requestPage:function(_40){
var row=this._pageToRow(_40);
var _41=Math.min(this.rowsPerPage,this.get("rowCount")-row);
if(_41>0){
this._requests++;
if(!this._requestsPending(row)){
setTimeout(_3.hitch(this,"_fetch",row,false),1);
}
}
},getCellName:function(_42){
return _42.field;
},_refresh:function(_43){
this._clearData();
this._fetch(0,_43);
},sort:function(){
this.edit.apply();
this._lastScrollTop=this.scrollTop;
this._refresh();
},canSort:function(){
return (!this._isLoading);
},getSortProps:function(){
var c=this.getCell(this.getSortIndex());
if(!c){
if(this.sortFields){
return this.sortFields;
}
return null;
}else{
var _44=c["sortDesc"];
var si=!(this.sortInfo>0);
if(typeof _44=="undefined"){
_44=si;
}else{
_44=si?!_44:_44;
}
return [{attribute:c.field,descending:_44}];
}
},styleRowState:function(_45){
if(this.store&&this.store.getState){
var _46=this.store.getState(_45.index),c="";
for(var i=0,ss=["inflight","error","inserting"],s;s=ss[i];i++){
if(_46[s]){
c=" dojoxGridRow-"+s;
break;
}
}
_45.customClasses+=c;
}
},onStyleRow:function(_47){
this.styleRowState(_47);
this.inherited(arguments);
},canEdit:function(_48,_49){
return this._canEdit;
},_copyAttr:function(idx,_4a){
var row={};
var _4b={};
var src=this.getItem(idx);
return this.store.getValue(src,_4a);
},doStartEdit:function(_4c,_4d){
if(!this._cache[_4d]){
this._cache[_4d]=this._copyAttr(_4d,_4c.field);
}
this.onStartEdit(_4c,_4d);
},doApplyCellEdit:function(_4e,_4f,_50){
this.store.fetchItemByIdentity({identity:this._by_idx[_4f].idty,onItem:_3.hitch(this,function(_51){
var _52=this.store.getValue(_51,_50);
if(typeof _52=="number"){
_4e=isNaN(_4e)?_4e:parseFloat(_4e);
}else{
if(typeof _52=="boolean"){
_4e=_4e=="true"?true:_4e=="false"?false:_4e;
}else{
if(_52 instanceof Date){
var _53=new Date(_4e);
_4e=isNaN(_53.getTime())?_4e:_53;
}
}
}
this.store.setValue(_51,_50,_4e);
this.onApplyCellEdit(_4e,_4f,_50);
})});
},doCancelEdit:function(_54){
var _55=this._cache[_54];
if(_55){
this.updateRow(_54);
delete this._cache[_54];
}
this.onCancelEdit.apply(this,arguments);
},doApplyEdit:function(_56,_57){
var _58=this._cache[_56];
this.onApplyEdit(_56);
},removeSelectedRows:function(){
if(this._canEdit){
this.edit.apply();
var fx=_3.hitch(this,function(_59){
if(_59.length){
_2.forEach(_59,this.store.deleteItem,this.store);
this.selection.clear();
}
});
if(this.allItemsSelected){
this.store.fetch({query:this.query,queryOptions:this.queryOptions,onComplete:fx});
}else{
fx(this.selection.getSelected());
}
}
}});
_a.cell_markupFactory=function(_5a,_5b,_5c){
var _5d=_3.trim(_9.attr(_5b,"field")||"");
if(_5d){
_5c.field=_5d;
}
_5c.field=_5c.field||_5c.name;
var _5e=_3.trim(_9.attr(_5b,"fields")||"");
if(_5e){
_5c.fields=_5e.split(",");
}
if(_5a){
_5a(_5b,_5c);
}
};
_a.markupFactory=function(_5f,_60,_61,_62){
return _7.markupFactory(_5f,_60,_61,_3.partial(_a.cell_markupFactory,_62));
};
return _a;
});
