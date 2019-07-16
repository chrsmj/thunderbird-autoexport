if (typeof(AutomaticExport) == "undefined")
{
	var AutomaticExport = {

		autoExportPrefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.AutomaticExport.prefid."),
		
				
		init : function(){
			dump("Aufruf: AutomaticExport.init() \n");
			AutomaticExport.autoExportPrefs.setIntPref("normal.IntervallTimer.ID", 0);
			AutomaticExport.autoExportPrefs.setIntPref("backup.IntervallTimer.ID", 0);
			AutomaticExport.initTimer("normal");
			AutomaticExport.initTimer("backup");
						
		},
		
		uninit : function(){
			dump("Aufruf: AutomaticExport.uninit() \n");
			AutomaticExport.uninitTimer("normal");
			AutomaticExport.uninitTimer("backup");
		},
				
		autoExportOnButton : function(mode){
			var localize = document.getElementById("autoExport");
			try
			{
				AutomaticExport.autoExport(mode);
			}
			catch(e)
			{
				alert(localize.getString( mode + '_error'));
			}
			return true;
		},
		
		getPath : function(path, mode){
			var pathForExport = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			if(AutomaticExport.autoExportPrefs.getIntPref(mode + ".exportPath") == 1)
			{
				var file = Components.classes["@mozilla.org/file/directory_service;1"].
								 getService(Components.interfaces.nsIProperties).
								 get("ProfD", Components.interfaces.nsIFile);
				var file2 = Components.classes["@mozilla.org/file/directory_service;1"].
								  getService(Components.interfaces.nsIProperties).
								  get("ProfD", Components.interfaces.nsIFile);
				var appendingPath = path;
				while(String(appendingPath).indexOf("..") != -1)
				{
					file2 = file.parent; 
					file = file2;		
					appendingPath = String(appendingPath).substr(String(appendingPath).indexOf("..") + 3);
				}

				if(String(appendingPath).charAt(0) == "/" || String(appendingPath).charAt(0) == "\\")
				{
					appendingPath = String(appendingPath).substr(1);
				}	
				pathForExport.initWithPath(file.path);
				if(String(appendingPath).length > 0)
				{
					pathForExport.append(appendingPath);
				}
			}
			else{
				pathForExport.initWithPath(path);
			}
			return pathForExport;
		},

		
		// function for file handle
		autoExportSaveEventsToFile : function(calendarEventArray, calendarName, mode, exportFormat){
			
			if (!calendarEventArray) return;

			if (!calendarEventArray.length) return;
		  
			// get the directory for Export
			var dirForExport = AutomaticExport.autoExportPrefs.getComplexValue(mode + ".directory", Components.interfaces.nsISupportsString);
			  
			// create the path with directory and file
			var pathForExport = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			pathForExport = AutomaticExport.getPath(dirForExport, mode);
			
			if(mode == "normal")
				pathForExport.append(calendarName + "." + exportFormat);
			else if(mode == "backup"){
				var date = new Date();
				var monthArray = new Array("01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12");
				var dayArray = new Array("00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31");
				pathForExport.append(date.getFullYear() + "-" + monthArray[date.getMonth()] + "-" + dayArray[date.getDate()] + "_" + calendarName + "." + exportFormat);
			}
	  
			// select the export format   
			switch (exportFormat) {
				case "ics":
					var exporter = Components.classes["@mozilla.org/calendar/export;1?type=ics"].getService(Components.interfaces.calIExporter);
					break;
				case "html":
					var exporter = Components.classes["@mozilla.org/calendar/export;1?type=htmllist"].getService(Components.interfaces.calIExporter);
					break;
				case "csv":
					var exporter = Components.classes["@mozilla.org/calendar/export;1?type=csv"].getService(Components.interfaces.calIExporter);
					break;
				default:
					var exporter = Components.classes["@mozilla.org/calendar/export;1?type=ics"].getService(Components.interfaces.calIExporter);
					break;
			}
	   
			var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
			try{
				outputStream.init(pathForExport, MODE_WRONLY | MODE_CREATE | MODE_TRUNCATE, 0664, 0);
				exporter.exportToStream(outputStream, calendarEventArray.length, calendarEventArray, null);
				outputStream.close();
				if (mode == "backup")
				{
					var numOfBackups = AutomaticExport.autoExportPrefs.getIntPref("backup.counter") + 1;
					AutomaticExport.deleteOldBackups(dirForExport, calendarName, numOfBackups);
				}
				dump("---" + mode + ": Calendar with name '" + calendarName + "' exported!\n");
			}catch(ex){
				showError(calGetString("calendar", "unableToWrite") + pathForExport.path );
			}
	 
		},


		// function for export the events
		autoExportEntireCalendar : function(calendarToExport, mode) {
			var itemArray = [];
			function getItemsFromCal(calToExport) {
				calToExport.getItems(Components.interfaces.calICalendar.ITEM_FILTER_ALL_ITEMS,
						0, null, null, getListener);
			}	
			var getListener = {
				onOperationComplete: function(calendarToExport, aStatus, aOperationType, aId, aDetail){
					// get the export format from preferences
					if (AutomaticExport.autoExportPrefs.getBoolPref(mode + ".exportFormat.ics"))
						AutomaticExport.autoExportSaveEventsToFile(itemArray, calendarToExport.name, mode, "ics");
					
					if (AutomaticExport.autoExportPrefs.getBoolPref(mode + ".exportFormat.html"))
						AutomaticExport.autoExportSaveEventsToFile(itemArray, calendarToExport.name, mode, "html");
					
					if (AutomaticExport.autoExportPrefs.getBoolPref(mode + ".exportFormat.csv"))
						AutomaticExport.autoExportSaveEventsToFile(itemArray, calendarToExport.name, mode, "csv");
				},
				onGetResult: function(calendarToExport, aStatus, aItemType, aDetail, aCount, aItems){
					for each (item in aItems)
						itemArray.push(item);   
				}
			};
			getItemsFromCal(calendarToExport);
		},

		// function to export 
		autoExport : function(mode){
			dump(mode + ": Export!!!!!\n");
			var localize = document.getElementById("autoExport");
			if (AutomaticExport.autoExportPrefs.getCharPref(mode + ".directory") == ""){ 
				alert(localize.getString('err_nodir'));
				return false;
			}
			var calendars = getCalendarManager().getCalendars({});
		
			// get calendar by his name (string)
			function getCalendarByName(calendarName) 
			{
				for each (var cal in calendars) {
					if (cal.name == calendarName)
						return cal; 
				}
				return null;
			}
			// export
			// export all calendars if the checkbox in the preferences is checked""
			if(AutomaticExport.autoExportPrefs.getBoolPref(mode + ".exportCalendars.allCalendars") == true)
			{
				for each (var cal in calendars)
					AutomaticExport.autoExportEntireCalendar(cal, mode);
			}
			// else export all calendars which are stored in the textbox 
			else{
				var calendarsToExport = AutomaticExport.autoExportPrefs.getCharPref(mode + ".exportCalendars.calendars");
				
				if (calendarsToExport == "")
					return true;
				var calArray = calendarsToExport.split(";");
				for(var i = 0; i < calArray.length; i++){
					AutomaticExport.autoExportEntireCalendar(getCalendarByName(calArray[i]), mode);
				}
			}
			
			if (AutomaticExport.autoExportPrefs.getBoolPref(mode + ".startApplication.activate") == true)
				startApp(mode);
		
			return true;
		},

		purgeBackupsByType : function(files, calName, dir, numOfBackups) {
			dump("---Aufruf: PurgeBackups\n");
			// filter out backups of the type we care about.
			var filteredFiles = files.filter(
				function f(v) { 
					return (v.name.indexOf(calName, 0) != -1)
				}
			);
			// Sort by lastmodifed
			filteredFiles.sort(
				function s(a,b) {
					return (a.lastmodified - b.lastmodified);
				}
			);
			// And delete the oldest files, and keep the desired number of
			// old backups
			var i;
			var file;
			for (i = 0; i < filteredFiles.length - numOfBackups; ++i) {
				dump(filteredFiles[i].name + " will be deleted\n");
				file = dir.clone();
				file.append(filteredFiles[i].name);
				// This can fail because of some crappy code in nsILocalFile.
				// That's not the end of the world.  We can try to remove the
				// file the next time around.
				try {
					file.remove(false);
					dump(filteredFiles[i].name + " deleted\n");
				} catch(ex) {}
			}
			return;
		},
	  
		deleteOldBackups : function(dir, calName, numOfBackups) {
			dump("---Aufruf: Delete old Backups\n");
			// Enumerate files in the backupdir for expiry of old backups
			var backupDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			backupDir.initWithPath(dir);
			var dirEnum = backupDir.directoryEntries;

			var files = [];
			while (dirEnum.hasMoreElements()) {
				var file = dirEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
				if (file.isFile())
					files.push({name: file.leafName, lastmodified: file.lastModifiedTime});
			}
			AutomaticExport.purgeBackupsByType(files, calName, backupDir, numOfBackups);
			return;
		},

	/******************************** Start Application ********************************/

		startApp : function(mode){
			dump("---Aufruf: startApp\n");
			var path      = AutomaticExport.autoExportPrefs.getComplexValue(mode + ".startApplication.appPath", Components.interfaces.nsISupportsString);
			var argumentstr = AutomaticExport.autoExportPrefs.getCharPref(mode + ".startApplication.appParams");
			var arguments = argumentstr.split(";");
			
			dump("Path: " + path + "\n" + "Argumente: " + argumentstr + "\n" );
			
			if (path == "") return false;
			
			var startAppFile    = Components.classes['@mozilla.org/file/local;1']
					.createInstance(Components.interfaces.nsILocalFile);
			var process = Components.classes['@mozilla.org/process/util;1']
					.getService(Components.interfaces.nsIProcess);
					
			startAppFile.initWithPath(path);
			if (!startAppFile.exists()) return false;
			if (!startAppFile.isExecutable()){
				startAppFile.launch();
				return true;
			}
			process.init(startAppFile);
			process.run(false, arguments, arguments.length);
			return true;
		},

	/******************************** Timer Export ********************************/


		initMenupopup : function(mode){

			document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.activate").setAttribute("checked", String(AutomaticExport.autoExportPrefs.getBoolPref(mode + ".button.timer.activate")));
			document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.value1").setAttribute("checked", "false");
			document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.value2").setAttribute("checked", "false");
			document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.value3").setAttribute("checked", "false");
			document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.value4").setAttribute("checked", "false");
			document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.userdefined").setAttribute("checked", "false");
	  
			var tempHour = parseInt(AutomaticExport.autoExportPrefs.getCharPref(mode + ".button.timer.hour")) * 60;
			var tempMinute = parseInt(AutomaticExport.autoExportPrefs.getCharPref(mode + ".button.timer.minute"));
				
			var exportInterval = (tempHour + tempMinute);
		 
			switch(exportInterval){
				case 15  : document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.value1").setAttribute("checked", "true"); break;
				case 30  : document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.value2").setAttribute("checked", "true"); break;
				case 60  : document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.value3").setAttribute("checked", "true"); break;
				case 120 : document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.value4").setAttribute("checked", "true"); break;
				default  : document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.userdefined").setAttribute("checked", "true");
			}
		  
		},

		setUserdefinedTime : function(mode){
			if(mode == "normal")
				var param = {inn:{mode:"normal"}, out:null};
			else if(mode == "backup")
				var param = {inn:{mode:"backup"}, out:null};

			window.openDialog("chrome://autoExport/content/timerUserdefined.xul", "",
							  "chrome,centerscreen,modal", param);
		},

		initUserdefinedTime : function(){
			var mode = window.arguments[0].inn.mode;
			document.getElementById("extensions.AutomaticExport.both.userdefined.hour").value = AutomaticExport.autoExportPrefs.getCharPref(mode + ".button.timer.hour");
			document.getElementById("extensions.AutomaticExport.both.userdefined.minute").value = AutomaticExport.autoExportPrefs.getCharPref(mode + ".button.timer.minute");
		},

		onAccept_Userdefined : function(){
			
			var mode = window.arguments[0].inn.mode;
			
			var tempHour = parseInt(document.getElementById("extensions.AutomaticExport.both.userdefined.hour").value) * 60;
			var tempMinute = parseInt(document.getElementById("extensions.AutomaticExport.both.userdefined.minute").value);
			var exportInterval = (tempHour + tempMinute);
		  
			AutomaticExport.setIntervallTime(mode, exportInterval);
		  
			return true;
		},

		onCancel_Userdefined : function(){
			if (navigator.platform.charAt('Win')) 
				return true;
			AutomaticExport.onAccept_Userdefined();
			return true;
		},

		setIntervallTime : function(mode, time){

			AutomaticExport.autoExportPrefs.setCharPref(mode + ".button.timer.hour", 0);
			AutomaticExport.autoExportPrefs.setCharPref(mode + ".button.timer.minute", time);
			AutomaticExport.autoExportPrefs.setBoolPref(mode + ".button.timer.activate", true);
			AutomaticExport.activateIntervall(mode);
		},

		onIntervallActivate : function(mode){
		  
			var state = document.getElementById("extensions.AutomaticExport.id." + mode + ".button.timer.activate").getAttribute("checked");
			if (state == "true")
			{
				AutomaticExport.autoExportPrefs.setBoolPref(mode + ".button.timer.activate", true);
				AutomaticExport.activateIntervall(mode);
			}
			else
			{
				AutomaticExport.autoExportPrefs.setBoolPref(mode + ".button.timer.activate", false);
				AutomaticExport.uninitTimer(mode);
			}
			
		},

		activateIntervall : function(mode){
			
			var timerID = AutomaticExport.autoExportPrefs.getIntPref(mode + ".IntervallTimer.ID");
			
			if(mode == "normal" && timerID != 0){
				clearInterval(timerID);
				timerID = 0;
			}else if (mode == "backup" && timerID != 0){
				clearInterval(timerID);
				timerID = 0;
			}
		  
			if (AutomaticExport.autoExportPrefs.getBoolPref(mode + ".button.timer.activate")){
			
				var tempHour = parseInt(AutomaticExport.autoExportPrefs.getCharPref(mode + ".button.timer.hour")) * 60;
				var tempMinute = parseInt(AutomaticExport.autoExportPrefs.getCharPref(mode + ".button.timer.minute"));
				
				var exportIntervalInMS = (tempHour + tempMinute) * 60 * 1000; // Mal 60 um in Sekunden umzurechnen und dann noch mal 1000 für Milisekunden
				
				if(mode == "normal"){
					timerID = setInterval("AutomaticExport.autoExport('normal')", exportIntervalInMS);
					dump("normal: Timer started with t = " + exportIntervalInMS + "ms and ID = " + timerID + "\n");
				}
				else if (mode == "backup"){
					timerID = setInterval("AutomaticExport.autoExport('backup')", exportIntervalInMS);
					dump("backup: Timer started with t = " + exportIntervalInMS + "ms and ID = " + timerID + "\n");
				}
				
			}
			
			AutomaticExport.autoExportPrefs.setIntPref(mode + ".IntervallTimer.ID", timerID);
			
		},

		initTimer : function(mode){
			AutomaticExport.activateIntervall(mode);
		},

		uninitTimer : function(mode){
			var timerID = AutomaticExport.autoExportPrefs.getIntPref(mode + ".IntervallTimer.ID");
			
			if (timerID != 0){
				clearInterval(timerID);
				dump(mode + ": Timer canceled with ID = " + timerID + "\n");
				timerID = 0;
				AutomaticExport.autoExportPrefs.setIntPref(mode + ".IntervallTimer.ID", timerID);
			}
			
		}
	};
};

