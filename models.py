# -*- coding: utf-8 -*- #
# Copyright 2011 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http:#www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

from google.appengine.ext import db

class DictModel(db.Model):
    def to_dict(self):
       dict = {}
       for p in self.properties():
         value = getattr(self, p)
         if isinstance(value, DictModel):
           dict[p] = value.to_dict()
         else:
           dict[p] = unicode(value)
       return dict

class Project(DictModel):
  code = db.StringProperty(required=True)
  title = db.StringProperty(required=True)
  admins = db.StringListProperty(required=True)
  deprecated = db.BooleanProperty()

class Subproject(DictModel):
  code = db.StringProperty(required=True)
  title = db.StringProperty(required=True)
  projectCode = db.StringProperty(required=True)
  deprecated = db.BooleanProperty()
  admins = db.StringListProperty(required=True)

class Milestone(DictModel):
  code = db.StringProperty(required=True)
  title = db.StringProperty()
  projectCode = db.StringProperty(required=True)
  deprecated = db.BooleanProperty()
  priority = db.IntegerProperty()

class Feature(DictModel):
  code = db.StringProperty(required=True)
  category = db.StringProperty()
  title = db.StringProperty(required=True)
  subprojectCode = db.StringProperty(required=True)
  bugNumber = db.IntegerProperty()
  notes = db.TextProperty()
  owner = db.StringProperty()
  quarter = db.IntegerProperty()
  year = db.IntegerProperty()
  tags = db.StringListProperty()
  priority = db.IntegerProperty()

class Task(DictModel):
  code = db.StringProperty(required=True)
  owner = db.StringProperty()
  title = db.StringProperty(required=True)
  originalEstimatedTime = db.FloatProperty(required=True)
  currentEstimatedTime = db.FloatProperty(required=True)
  actualTime = db.FloatProperty(required=True)
  featureCode = db.StringProperty(required=True)
  startDate = db.DateProperty()
  endDate = db.DateProperty()
  bugNumber = db.IntegerProperty()
  notes = db.TextProperty()
  priority = db.IntegerProperty()
  unplanned = db.BooleanProperty()
  active = db.BooleanProperty()

class Contributor(DictModel):
  user = db.UserProperty(required=True)
  role = db.StringProperty()
  admin = db.BooleanProperty(required=True)

class Team(DictModel):
  name = db.StringProperty(required=True)
  members = db.StringListProperty(required=True)

class Snapshot(DictModel):
  date = db.DateTimeProperty(required=True)
  code = db.StringProperty(required=True)
  projectCode = db.StringProperty(required=True)
  name = db.StringProperty(required=False)
  deprecated = db.BooleanProperty(required=False)

class TaskSnapshot(DictModel):
  snapshotCode = db.StringProperty(required=True)
  taskCode = db.StringProperty(required=True)
  originalEstimatedTime = db.FloatProperty(required=True)
  currentEstimatedTime = db.FloatProperty(required=True)
  actualTime = db.FloatProperty(required=True)

class DailyTagSnap(DictModel):
  date = db.DateProperty(required=True)
  tag = db.StringProperty(required=True)
  projectCode = db.StringProperty(required=True)
  originalEstimatedTime = db.FloatProperty(required=True)
  currentEstimatedTime = db.FloatProperty(required=True)
  actualTime = db.FloatProperty(required=True)

