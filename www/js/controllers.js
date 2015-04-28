angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope) {})

.controller('ChatsCtrl', function($scope, Chats) {
  $scope.chats = Chats.all();
  $scope.toggleChat = function(chat) {
    if ($scope.isChatShown(chat)) {
      $scope.shownChat = null;
    } else {
      $scope.shownChat = chat;
    }
  };
  $scope.isChatShown = function(chat) {
    return $scope.shownChat === chat;
  };
})

.controller('ChatDetailCtrl', function($scope, $state, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
  $scope.remove = function(chat) {
    Chats.remove(chat);
    $state.transitionTo('tab.chats', {}, {});
  };
})

.controller('BLECtrl', function($scope, BLE) {

  // keep a reference since devices will be added
  $scope.devices = BLE.devices;

  var success = function () {
    if ($scope.devices.length < 1) {
      // a better solution would be to update a status message rather than an alert
      alert("Didn't find any Bluetooth Low Energy devices.");
    }
  };

  var failure = function (error) {
      alert(error);
  };

  // pull to refresh
  $scope.onRefresh = function() {
    BLE.scan().then(
      success, failure
    ).finally(
      function() {
        $scope.$broadcast('scroll.refreshComplete');
      }
    )
  }

  // initial scan
  BLE.scan().then(success, failure);

  // disconnect device when we leave the BLE tab
  $scope.on('$ionicView.beforeLeave', function() {
    BLE.disconnect();
  });
})

.controller('BLEServicesCtrl', function($scope, $stateParams, BLE, BLEActiveDevice) {
  // connect to the appropriate device
  BLE.connect($stateParams.deviceId).then(
    function(peripheral) {
      $scope.device = peripheral;
    }
  );

  // populate factory with attributes we want to use for notify
  $scope.setAttributes = function(deviceId, serviceId, characteristicId) {
    BLEActiveDevice.setAttributes(deviceId, serviceId, characteristicId);
  }
})

.controller('BLENotifyCtrl', function($scope, $stateParams, BLE, BLEActiveDevice) {
  // grab attributes from factory
  $scope.device = BLEActiveDevice.getAttributes()['device'];
  $scope.service = BLEActiveDevice.getAttributes()['service'];
  $scope.characteristic = BLEActiveDevice.getAttributes()['characteristic'];
  $scope.notifications = [];

  // subscribe to notifications
  BLE.startNotification($scope.device, $scope.service, $scope.characteristic,
    function(notification) {
      notifications.push(notification);
    },
    function() {
      console.log('Failed to start notifications');
      alert('Failed to start notifications');
    });
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
})

.controller('LoginController', function($scope, $state, $rootScope, $ionicLoading) {
  $scope.user = {
    username: null,
    password: null
  };

  $scope.error = {};

  $scope.login = function() {
    $scope.loading = $ionicLoading.show({
      content: 'Logging in',
      animation: 'fade-in',
      showBackdrop: true,
      maxWidth: 200,
      showDelay: 0
    });

    var user = $scope.user;
    Parse.User.logIn(('' + user.username).toLowerCase(), user.password, {
      success: function(user) {
        $ionicLoading.hide();
        $rootScope.user = user;
        $rootScope.isLoggedIn = true;
        $state.go('app.home', {
            clear: true
        });
      },
      error: function(user, err) {
        $ionicLoading.hide();
        // The login failed. Check error to see why.
        if (err.code === 101) {
          $scope.error.message = 'Invalid login credentials';
        } else {
          $scope.error.message = 'An unexpected error has ' +
            'occurred, please try again.';
        }
        $scope.$apply();
      }
    });
  };

  $scope.forgot = function() {
    $state.go('app.forgot');
  };
})
