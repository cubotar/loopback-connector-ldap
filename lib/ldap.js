
var g = require('strong-globalize')();
var Connector = require('loopback-connector').Connector;
var debug = require('debug')('loopback:connector:ldap');
var ldapclient = require('ldapjs');
var util = require('util');

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
    dataSource.ldapClient.bind(settings.bindDn, settings.bindPassword, function(err) {
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
     self.ldapClient.bind(settings.bindDn, settings.bindPassword, function(err) {
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


 LDAPConnector.prototype.LDAPtoModel =function(ldapEntry,model){
    var self = this;
    var modelMapping = self.settings.modelMapping[model]['mapping'];
    if(!modelMapping) {
      consolg.log(" Couldn't find a model mapping for "+model);
    }  
    var modelInstance = {};

    for(var key in modelMapping){
      if(modelMapping[key] && ldapEntry[modelMapping[key]]){
            modelInstance[key] = ldapEntry[modelMapping[key]];
      }
    }
    return modelInstance;
  }

 LDAPConnector.prototype.modeltoLDAPFilter =function(filter,model) {
    var self = this;
    var modelMapping = self.settings.modelMapping[model]['mapping'];

    if(!modelMapping) {
      consolg.log(" Couldn't find a model mapping for "+model);
    }   
    var ldapInstance = "";

    for(var key in modelMapping){
      if(modelMapping[key] && filter[key]){
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
      var modelMapping = self.settings.modelMapping[model]['mapping'];
      if(!modelMapping) {
        consolg.log(" Couldn't find a model mapping for "+model);
      }   
      var ldapEntry = {};
      for(var key in modelMapping){
        if(modelMapping[key] && data[key]){
             ldapEntry[modelMapping[key]] = data[key];
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
     self.ldapClient.add("cn="+ldapEntry['cn']+","+self.settings.searchBase, ldapEntry , function(err) {
        if(err){
          console.log("Could Not add new Entry");
          callback(null, null);
        } else{
          self.ldapClient.search("cn="+ldapEntry['cn']+","+self.settings.searchBase, {scope :'sub' , attributes: ['entryUUID'] },function(err,res){
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
          // console.log('status: ' + result.status + queryResult);
          callback(null, queryResult);
        });
    });

  };








