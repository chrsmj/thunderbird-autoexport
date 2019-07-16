function getCompositeCalendar() {
  return {
    defaultCalendar: {
      id: 0 /* or the default calendar that should be selected */
    }
  };
}


if (typeof(AutoExportSettings) == "undefined")
{

	var AutoExportSettings = {

		autoExportPrefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.AutomaticExport.prefid."),
				
		cleanFromUnnecessarySemicolon : function(calendarNames){
			var newCalendarNames = calendarNames.replace(";;", ";");
			if(newCalendarNames.charAt(newCalendarNames.length - 1) == ";"){
				newCalendarNames = newCalendarNames.substring(0, newCalendarNames.length - 1);
			}
			return newCalendarNames;
		},

		onLoad : function(mode) {
			sizeToContent();
		},
  
		onAccept : function() {
			
			
			if (AutoExportSettings.autoExportPrefs.getBoolPref("normal.button.timer.activate")){
				AutomaticExport.initTimer("normal");
			}
			else{
				AutomaticExport.uninitTimer("normal");
			}
			
			if (AutoExportSettings.autoExportPrefs.getBoolPref("backup.button.timer.activate")){
				AutomaticExport.initTimer("backup");
			}
			else{
				AutomaticExport.uninitTimer("backup");
			}
			return true;
		},
  
		onCancel : function() {
			if (navigator.platform.charAt('Win')) 
				return true;
			AutoExportSettings.onAccept();
			return true;
			
		},
  	
		initControls : function(mode) {
			AutoExportSettings.toggleAllCalendar(mode);
			AutoExportSettings.toggleStartApp(mode);
			AutoExportSettings.setOnStartup(mode);
			AutoExportSettings.toggleExportPath(mode);
		},
	
		getCalendarToExport : function(mode) {	
			var localize = document.getElementById("extensions.AutomaticExport.id.stringbundle");
			const PROMPTTEXT_CALENDAR = localize.getString('calendarDialogPrompttext');		
			function setCalendarToTextbox(calendarToExport) {
				var currentCalendars = document.getElementById("extensions.AutomaticExport.prefid." + mode + ".exportCalendars.calendars").value;
				// is the textbox empty
				if (currentCalendars == ""){
					document.getElementById("extensions.AutomaticExport.prefid." + mode + ".exportCalendars.calendars").value = calendarToExport.name;
					document.getElementById("extensions.AutomaticExport.id." + mode + ".exportCalendars.calendars").value = calendarToExport.name;
				}else{
					// is the calendar always registered
					if(currentCalendars.indexOf(calendarToExport.name) == -1){
						document.getElementById("extensions.AutomaticExport.prefid." + mode + ".exportCalendars.calendars").value = AutoExportSettings.cleanFromUnnecessarySemicolon(currentCalendars) + ";" + calendarToExport.name;
						document.getElementById("extensions.AutomaticExport.id." + mode + ".exportCalendars.calendars").value = AutoExportSettings.cleanFromUnnecessarySemicolon(currentCalendars) + ";" + calendarToExport.name;
					}
				}
			}	
			var args = new Object();
			args.onOk = setCalendarToTextbox;
			args.promptText = PROMPTTEXT_CALENDAR;
			openDialog("chrome://calendar/content/chooseCalendarDialog.xul", 
						   "_blank", "chrome,titlebar,modal,resizable", args);
			return true;
		},
	
		removeCalendarToExport : function(mode) {			
			var localize = document.getElementById("extensions.AutomaticExport.id.stringbundle");
			const PROMPTTEXT_CALENDAR = localize.getString('calendarDialogPrompttext');		
			function removeCalendarFromTextbox(calendarToExport) {
				
				var currentCalendars = document.getElementById("extensions.AutomaticExport.prefid." + mode + ".exportCalendars.calendars").value;
				
				// is the textbox empty
				if (currentCalendars == "") 
					return;
				else{
					// is the calendar always registered
					if(currentCalendars.indexOf(calendarToExport.name) != -1){
						var calendarName = calendarToExport.name;
						currentCalendars = currentCalendars.replace(calendarName, "");
						document.getElementById("extensions.AutomaticExport.prefid." + mode + ".exportCalendars.calendars").value = AutoExportSettings.cleanFromUnnecessarySemicolon(currentCalendars);
						document.getElementById("extensions.AutomaticExport.id." + mode + ".exportCalendars.calendars").value = AutoExportSettings.cleanFromUnnecessarySemicolon(currentCalendars);
					}
				}
			}
			
			
			var args = new Object();
			args.onOk = removeCalendarFromTextbox;
			args.promptText = PROMPTTEXT_CALENDAR;
			openDialog("chrome://calendar/content/chooseCalendarDialog.xul", 
						   "_blank", "chrome,titlebar,modal,resizable", args);    
			return true;
		},
	
		getDirForExport : function(mode) {	 
			var localize = document.getElementById("extensions.AutomaticExport.id.stringbundle");
			const PROMPTTEXT_DIRECTORY= localize.getString('directoryDialogPrompttext');
			const CURRENTDIRFOREXPORT = document.getElementById("extensions.AutomaticExport.prefid." + mode + ".directory").value;
			var newDirForExport = null;
			// set current path as new beginning for searching
			if(CURRENTDIRFOREXPORT != ""){
				try{
					newDirForExport = Components.classes["@mozilla.org/file/local;1"]
										.createInstance(Components.interfaces.nsILocalFile);
					newDirForExport.initWithPath(CURRENTDIRFOREXPORT);
				}catch(e){
					newDirForExport = Components.classes['@mozilla.org/file/directory_service;1']
																		.createInstance(Components.interfaces.nsIProperties)
																		.get("CurProcD", Components.interfaces.nsIFile);
				}
			}
			// set the installation-directory as beginning for searching
			else{
				newDirForExport = Components.classes['@mozilla.org/file/directory_service;1']
																		.createInstance(Components.interfaces.nsIProperties)
																		.get("CurProcD", Components.interfaces.nsIFile);
			}
			var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);			
			fp.displayDirectory = newDirForExport; 
			fp.init(window, PROMPTTEXT_DIRECTORY, Components.interfaces.nsIFilePicker.modeGetFolder);
			fp.appendFilters(Components.interfaces.nsIFilePicker.filterAll);		  
			if (fp.show()==Components.interfaces.nsIFilePicker.returnOK) {
				newDirForExport = fp.file.QueryInterface(Components.interfaces.nsILocalFile);
				document.getElementById("extensions.AutomaticExport.prefid." + mode + ".directory").value = newDirForExport.path;
				document.getElementById("extensions.AutomaticExport.id." + mode + ".directory").value = newDirForExport.path; 
			}
		},
		
		showProfDir : function() {
			
			var file = Components.classes["@mozilla.org/file/directory_service;1"].
								 getService(Components.interfaces.nsIProperties).
								 get("ProfD", Components.interfaces.nsIFile);
			alert(file.path);
			return true;
		},
  
		toggleAllCalendar : function(mode){
			var chkbox = document.getElementById("extensions.AutomaticExport.id." + mode + ".exportCalendars.allCalendars").checked;
			document.getElementById("extensions.AutomaticExport.id." + mode + ".exportCalendars.calendars").disabled = chkbox;
			document.getElementById("extensions.AutomaticExport.id." + mode + ".exportCalendars.getButton").disabled = chkbox;
			document.getElementById("extensions.AutomaticExport.id." + mode + ".exportCalendars.removeButton").disabled = chkbox;
		},
	
		toggleExportPath : function(mode){
			var index = document.getElementById("extensions.AutomaticExport.id." + mode + ".exportPath").selectedIndex;
			AutoExportSettings.autoExportPrefs.setIntPref(mode + ".exportPath", index);
			if (index == 1 ) { document.getElementById("extensions.AutomaticExport.id." + mode + ".exportDirectory.button").disabled = true;}
			else{
				document.getElementById("extensions.AutomaticExport.id." + mode + ".exportDirectory.button").disabled = false;
			}
		},
	
		setOnStartup : function(mode){
			document.getElementById("extensions.AutomaticExport.id." + mode + ".exportPath").selectedIndex = AutoExportSettings.autoExportPrefs.getIntPref(mode + ".exportPath");
		},
  
		toggleStartApp : function(mode){
			var chkbox = document.getElementById("extensions.AutomaticExport.id." + mode + ".startApplication.activate").checked;
			document.getElementById("extensions.AutomaticExport.id." + mode + ".startApplication.appPath").disabled = !chkbox;
			document.getElementById("extensions.AutomaticExport.id." + mode + ".startApplication.appParams").disabled = !chkbox;
		}
		
	};
};