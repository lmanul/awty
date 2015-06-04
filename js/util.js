//
// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

goog.provide('awty.Util');


/**
 * Rounds the given number to the given number of decimals.
 */
awty.Util.roundNumber = function(number, decimals)  {
	var result = Math.round(number * Math.pow(10, decimals)) /
      Math.pow(10, decimals);
	return result;
};


/**
 * Generates a random string code that's extremely unlikely to collide with
 * another random code.
 */
awty.Util.getRandomCode = function() {
  var length = 7;
  var str = '';
  for (var i = 0; i < length; i++) {
      str += awty.CHARS_FOR_CODES[
          Math.floor(Math.random() * awty.CHARS_FOR_CODES.length)];
  }
  return str;
};


awty.Util.getProjectUrl = function() {
  var delimiter = '/';
  var fullLocation = window.location.href;
  var paths = fullLocation.split(delimiter);
  return paths.slice(0, 4).join(delimiter);
};
