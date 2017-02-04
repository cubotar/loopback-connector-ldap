
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
  if (!ldap-client) {
    return;
  }
  
  // Add check to settings
  var settings = dataSource.settings;
  dataSource.connector = new LDAPConnector(settings,dataSource);
  dataSource.ldapClient = ldapclient.createClient({
      url : settings.url
     
   });

  if (callback) {
      dataSource.connector.connect(callback);
  }

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
   debug('Connector settings' , settings);
};

util.inherits(LDAPConnector, Connector);


LDAPConnector.prototype.connect = function(callback){

   // TODO : the callback
   var self = this;
   self.ldapClient.bind(settings.bindDn, settings.bindPassword, function(err) {
      g.error("LDAP Connection FAILED");
      assert.ifError(err);
   });

};

LDAPConnector.prototype.disconnect = function(callback){
  // TODO: the callback
  var self = this;
  self.ldapClient.unbind(function(err){
       g.error("LDAP disconnection FAILED");
       assert.ifError(err);
  });

};


LDAPConnector.prototype.ping = function(callback) {
  // ...
};


LDAPConnector.prototype.execute = function(model, command) {
  // ...
};



LDAPConnector.prototype.create = function(data, callback) {
  // TODO : Only if debug is activated
  debug('Creating LDAP entry'  , data);
  var self = this;
  var modelMapping = self.settings.modelMapping;
  for(var key in data){
    if(!modelMapping['ldap_attribute_for_'+key]){
      entry[modelMapping['ldap_attribute_for_'+key]] = data['key'];
    }
  }
  // TODO : check ig settings.searchBase exists ..
  self.ldapClient.add(self.settings.searchBase, entry ,fucntion(err){
      g.error("Adding a new entry to LDAP FAILED");
      assert.ifError(err);
  });
};





