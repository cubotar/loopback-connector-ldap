
var g = require('strong-globalize')();
var Connector = require('loopback-connector').Connector;
var debug = require('debug')('loopback:connector:ldap');
var ldapclient = require('ldapjs');
var util = require('util');

var utils = require('loopback-datasource-juggler/lib/utils');

  /**
   * Initialize the LDAP Connector for the given data source
   * @param {DataSource} dataSource The data source instance
   * @param {Function} [callback] The callback function
   */
  exports.initialize = function initializeDataSource(dataSource, callback) {
    if (!ldapclient) {
      return;
    }
    // Add check to settings
    var settings = dataSource.settings;
    dataSource.ldapClient = ldapclient.createClient({
        url : settings.host+":"+settings.port    
    });
    dataSource.ldapClient.bind(settings.user, settings.password, function(err) {
        if(err){
          console.log(err);
        }else{
          console.log("LDAP Connexion SUCCESFUL");
        }
    });

    dataSource.connector = new LDAPConnector(settings,dataSource);
    process.nextTick(function () {
      callback && callback();
    });

  };

  /**
   * The constructor for LDAP connector
   * @param {Object} settings The settings object
   * @param {DataSource} dataSource The data source instance
   * @constructor
   */
  function LDAPConnector(settings, dataSource){
     Connector.call(this,'ldap',settings);
     this.dataSource = dataSource;
     this.ldapClient = dataSource.ldapClient;
     debug('Connector settings' , settings);
  };
  

  util.inherits(LDAPConnector, Connector);


  LDAPConnector.prototype.connect = function(callback){

     var self = this;
     console.log("Binding with the LDAP");
     self.ldapClient.bind(self.settings.user, self.settings.password, function(err) {
        if(err){
          console.log(err);
        }else{
          console.log("LDAP Connexion SUCCESFUL");
        }
        
     });
    process.nextTick(function () {
      callback && callback();
    });

  };

  LDAPConnector.prototype.disconnect = function(callback){
    
    var self = this;
    self.ldapClient.unbind(function(err){
         if(err){
            g.error("LDAP disconnection FAILED");
         }
    });
    process.nextTick(function () {
      callback && callback();
    });

  };


  LDAPConnector.prototype.ping = function(callback) {
    console.log("Calling ping");
  };

  LDAPConnector.prototype.execute = function(model, command) {
    // ...
  };

  LDAPConnector.prototype.create = function(model,data, callback) {
    var self = this;
    var modelMapping = self.settings.modelMapping[model]['mapping'];
    if(!modelMapping) {
      consolg.log(" Couldn't find a model mapping for "+model);
    }
    for(var key in data){
      if(!modelMapping[key]){
        entry[modelMapping[key]] = data['key'];
      }
    }
    // TODO : check ig settings.searchBase exists ..
    self.ldapClient.add(self.settings.searchBase, entry ,function(err){
        g.error("Adding a new entry to LDAP FAILED");
        assert.ifError(err);
    });
  };


 LDAPConnector.prototype.LDAPtoModel = function(ldapEntry, model){

    var self = this;
    var modelMapping = self.settings.modelMapping[model]['mapping'];
    if(!modelMapping) {
      consolg.log(" Couldn't find a model mapping for "+model);
    }  
    var modelInstance = {};
 
    for(var key in modelMapping)
	{
      if(modelMapping[key] && ldapEntry[modelMapping[key]]){
            	modelInstance[key] = ldapEntry[modelMapping[key]];
      }
    }
    //This is method invoked when getting user from ldap : http://10.96.5.36:3000/api/AppUsers/uid
    return modelInstance;

	
  };


 LDAPConnector.prototype.modeltoLDAPFilter =function(filter,model) {
    var self = this;
    var modelMapping = self.settings.modelMapping[model]['mapping'];


    if(!modelMapping) {
      consolg.log(" Couldn't find a model mapping for "+model);
    }   
    var ldapInstance = "";

    for(var key in modelMapping){
      //implement ldap search with operators : OR,AND,NOT vs loopback search : INQ,OR,AND
      //INQ => | (OR)
      //AND => & (AND)
      //OR => | (OR)
      //implementation of INQ / OR(|) operator : loopback to ldap
      if (filter[key] && filter[key]['inq']) {
        var list = filter[key]['inq'];
        ldapInstance+="("+ "|";
        list.forEach(function(element) {
           ldapInstance+="(" + modelMapping[key]+"="+ element +")";
        });
        ldapInstance+=")";
      }else if (filter[key] && filter[key]['or']) {
        //TODO
      }else if (filter[key] && filter[key]['and']) {
        //TODO
      }else if(modelMapping[key] && filter[key]){
           ldapInstance+="("+ modelMapping[key]+"="+ filter[key]+")";
      }
    }
    return ldapInstance;
 }


 LDAPConnector.prototype.count = function(model, where, options, callback) {

    var self = this;
    // Building filter
    var searchFilter={};
    
    if(where){
      
      searchFilter=self.modeltoLDAPFilter(where,model);
    }else{
      searchFilter=self.settings.searchBaseFilter;
    }
    if (searchFilter.indexOf('uniquemember',0) != -1){
      searchFilter = searchFilter.substring(0,searchFilter.length-2);
      searchFilter = searchFilter + '*)';
    }

    var opts = { 
       filter: searchFilter,
       scope :'sub',
       attributes: self.settings.modelMapping.id,
    };

    
    self.ldapClient.search(self.settings.searchBase, opts ,function(err,res){
        var queryResult = [];
        
        res.on('searchEntry', function(entry) {
          queryResult.push(self.LDAPtoModel(entry.object,model));
        });

        res.on('searchReference', function(referral) {
          console.log('referral: ' + referral.uris.join());
        });

        res.on('error', function(err) {
          console.error('error: ' + err.message);
          callback(null, -1);
        });

        res.on('end', function(result) {
          console.log('status: ' + result.status);
          callback(null, queryResult.length);
        });

    });

 };




  LDAPConnector.prototype.modeltoLDAPEntry = function(data,model){
      var self = this;
      var reverseModelMapping = self.settings.modelMapping[model]['reverseMapping'];
      if(!reverseModelMapping) {
        consolg.log(" Couldn't find a reverse model mapping for "+model);
      }   
      var ldapEntry = {};
      for(var key in reverseModelMapping){
        if(reverseModelMapping[key] && data[reverseModelMapping[key]]){
             ldapEntry[key] = data[reverseModelMapping[key]];
        }
      }
      ldapEntry['objectclass'] = self.settings.modelMapping[model]['objectclass'];
      ldapEntry['cn'] = "";
      for(var i = 0; i < self.settings.modelMapping[model]['cn'].length ; i++  ){
        ldapEntry['cn'] += data[self.settings.modelMapping[model]['cn'][i]] +" ";
      }
      return ldapEntry;

  }

  LDAPConnector.prototype.create = function (model, data, callback) {
     var self = this;
     var ldapEntry = this.modeltoLDAPEntry(data,model );
     
     //allow custom dn (custom branch) from end user request, but can't post json request with attribute dn : ObjectclassViolationError
     var dn = ldapEntry['dn'];
     delete data.dn; 
     ldapEntry = this.modeltoLDAPEntry(data,model ); 
     
     //group creation 
     if (ldapEntry['objectclass'][0] == 'groupOfUniqueNames'){
       dn = 'cn='+ldapEntry['name']+self.settings.searchBase;
     }

     self.ldapClient.add(dn, ldapEntry , function(err) {
        
        if(err){
	  console.log(err);
          console.log("Could Not add new Entry");
          callback(err, null);
        } else{
          self.ldapClient.search(dn, {scope :'sub' },function(err,res){
              var newEntry = [];

              res.on('searchEntry', function(entry) {
                newEntry = self.LDAPtoModel(entry.object,model);
              });
              res.on('searchReference', function(referral) {
                console.log('referral: ' + referral.uris.join());
              });
              res.on('error', function(err) {
                console.error('error: ' + err.message);
              });
              res.on('end', function(result) {
                console.log('status: ' + result.status);
                callback(null, newEntry.id );
              });
          });
          
        }

        
     });

  };


 LDAPConnector.prototype.all = function(model,filter, callback) {
    
    var self = this;
    // Building filter
    var searchFilter={};
    if(filter['where']){
      searchFilter=self.modeltoLDAPFilter(filter['where'],model);
    }else{
      searchFilter=self.settings.searchBaseFilter;
    }
    if (searchFilter.indexOf('uniquemember',0) != -1){
      searchFilter = searchFilter.substring(0,searchFilter.length-2);
      searchFilter = searchFilter + '*)';
    }
    var modelMapping = self.settings.modelMapping[model]['mapping'];
    if(!modelMapping) {
      consolg.log(" Couldn't find a model mapping for "+model);
    }
    var requiredAttributes = [];
    for(var key in modelMapping){
      requiredAttributes.push(modelMapping[key]);
    }

    var opts = { 
       filter: searchFilter,
       scope :'sub',
       attributes: requiredAttributes,
    };
 
    self.ldapClient.search(self.settings.searchBase, opts ,function(err,res){
        var queryResult = [];

        res.on('searchEntry', function(entry) {
          queryResult.push(self.LDAPtoModel(entry.object,model));
        });
        res.on('searchReference', function(referral) {
          console.log('referral: ' + referral.uris.join());
        });
        res.on('error', function(err) {
          console.error('error: ' + err.message);
        });
        res.on('end', function(result) {
          callback(null, queryResult);
        });
    });

  };




