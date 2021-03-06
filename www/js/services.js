angular.module('starter.services', [])

.factory('BLE', function($q) {

  var connected;

  return {

    devices: [],

    disconnect: function() {
      if (connected) {
        var id = connected.id;
        ble.disconnect(connected.id, function() {
          console.log("Disconnected " + id);
        });
        connected = null;
      }
    },

    scan: function() {
        var that = this;
        var deferred = $q.defer();

        that.devices.length = 0;

        ble.startScan([],  /* scan for all services */
            function(peripheral){
                that.devices.push(peripheral);
            },
            function(error){
                deferred.reject(error);
            });

        // stop scan after 5 seconds
        setTimeout(ble.stopScan, 5000,
            function() {
                deferred.resolve();
            },
            function() {
                console.log("stopScan failed");
                deferred.reject("Error stopping scan");
            }
        );

        return deferred.promise;
    },

    connect: function(deviceId) {
        var deferred = $q.defer();

        ble.connect(deviceId,
            function(peripheral) {
                connected = peripheral;
                deferred.resolve(peripheral);
            },
            function(reason) {
                deferred.reject(reason);
            }
        );

        return deferred.promise;
    },

    notify: function(deviceId) {
      var deferred = $q.defer();
      var serviceId = "c84fcc88-8610-4874-85c6-fe7483abe0c1";
      var accelCharacteristic = "ACC119df-eb7a-49d0-92f9-b6b97846a860";

      ble.startNotification(deviceId, serviceId, accelCharacteristic,
          function(data) {
            deferred.resolve(data);
          },
          function(reason){
            deferred.reject(reason);
          }
      );

      return deferred.promise;
    },
  };
})

.factory('BLEActiveDevice', function() {
  // store services/characteristics here so we can subscribe to notifications
  var device;
  var serviceId = "c84fcc88-8610-4874-85c6-fe7483abe0c1";
  var characteristicId;
  var accelCharacteristic = "ACC119df-eb7a-49d0-92f9-b6b97846a860";
  var capCharacteristic = "CA9fcf1a-b2bd-42f6-90c5-3e829a9f3d48";
  var pitch;
  var roll;
  var z;

  // ASCII only
  function bytesToString(buffer) {
      return String.fromCharCode.apply(null, new Uint16Array(buffer));
  }

  function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
  }

  function accWrap(x) {
    if (x > 32768) {
      return (x % 32768) - 32768;
    }
    return x;
  }

  return {
    getAttributes: function() {
      return {
        'device': device,
        'service': serviceId,
        'characteristic': characteristicId
      };
    },
    getDevice: function() {
      return device;
    },
    setBias: function() {
      var success = function() {
        alert("Calibrated!");
      }
      ble.write(device, serviceId, writeCharacteristic, z - 1000, success);
    },
    stopNotify: function() {
      ble.stopNotification(device, serviceId, accelCharacteristic);
    },
    setAttributes: function(newDevice, service, characteristic) {
      device = newDevice;
      serviceId = service;
      characteristicId = characteristic;
    },
    setDevice: function(newDevice) {
      device = newDevice;
    },
    read: function() {
      var successCallback = function(data) {
        alert(data);
      }
      ble.read( device,
                serviceId,
                characteristicId,
                successCallback
              );
    },
    notifyAccel: function(scope) {
      var successCallback = function(data) {
        var dataRead = function(data) {
          var bufView = new Uint16Array(data);
          var x = accWrap(bufView[0]);
          var y = accWrap(bufView[1]);
          z = accWrap(bufView[2]);
          pitch = Math.atan(-y/z) * Math.PI * 90 / 4;
          roll = Math.atan(-x/z) * Math.PI * 90 / 4;
          if (Math.abs(pitch) > Math.abs(roll)) {
            rotateAmount = pitch;
          } else {
            rotateAmount = roll;
          }
          scope.bottlestyle = "-webkit-transform: rotate(" + rotateAmount + "deg)";
          scope.$apply();
        }
        ble.read(device, serviceId, accelCharacteristic, dataRead);
      }

      var failureCallback = function(reason) {
        alert("ERROR: " + reason);
      }
      ble.notify(device, serviceId, accelCharacteristic, successCallback, failureCallback);
    },
    readAccel: function() {
      var successCallback = function(data) {
        alert(bytesToString(data));
        alert(data);
      }

      ble.read(device, serviceId, accelCharacteristic, successCallback);
    },
    readCap: function(scope, user, handle) {
      var successCallback = function(data) {
        var bufView = new Uint8Array(data);
        var highByte = bufView[0];
        var midByte = bufView[1];
        var lowByte = bufView[2];

        var capValue = parseInt("" + highByte + midByte + lowByte);
        alert("2");
        // TODO: Convert capValue to a percentage using the information from the calibration
        // water_pct[getDate()] = 65;
        if (handle == 0) {
          user.set("empty_value", capValue);
          user.save();
        } else if (handle == 1) {
          user.set("full_value", capValue);
          user.save();
        } else if (handle == 2) {
          var recentValue = parseInt(user.get("recent_value"));
          //Water level dropped, else user filled water bottle
          alert(capValue);
          alert(recentValue);

          //set most recent value no matter what
          user.set("recent_value", capValue);
          user.save();
          alert("saved");
          alert(capValue - recentValue);
          if (recentValue && ((capValue - recentValue) < 0)) {
            var fullValue = parseInt(user.get("full_value"));
            var emptyValue = parseInt(user.get("empty_value"));
            var percentIncrease = (recentValue - capValue) / (fullValue - emptyValue);
            scope.percentage = parseInt(scope.percentage) + parseInt(percentIncrease);
          } else {
            scope.percentage = 0;
          }
        }

        var water_pct = user.get("water_pct");
        water_pct[today] = scope.percentage;
        user.set("water_pct", water_pct);
        user.save();

        scope.capValue = capValue;
        scope.$apply();
      }
      alert("1");
      ble.read(device, serviceId, capCharacteristic, successCallback);
    },
  }
});
