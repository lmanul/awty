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

goog.provide('awty.ChartMaker');

awty.ChartMaker.drawChart = function(element, dataArray) {
  var data = new google.visualization.DataTable();
  data.addColumn('date', 'Date');
  data.addColumn('number', 'Estimate');
  data.addColumn('number', 'Actual');
  for (var i = 0; i < dataArray.length; i++) {
    point = dataArray[i];
    data.addRow([new Date(point[0]), parseFloat(point[1]), parseFloat(point[2])]);
  }
  var chart = new google.visualization.AnnotatedTimeLine(element);
  chart.draw(data, {displayAnnotations: true});
};
