#
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

from google.appengine.api import users

from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

import datetime
import urllib

from models import *
from util import *

class SnapshotHandler(webapp.RequestHandler):
  def get(self, projectCodeParam):
    projectCode = urllib.unquote(projectCodeParam)
    project = Project.gql("WHERE code = '" + projectCode + "'").get()
    if project == None:
      self.response.headers['Status'] = 403
      self.response.out.write('No project with code ' + projectCode)
      return

    code = self.request.GET.get('code');
    if code == None or code == '':
      self.response.headers['Status'] = 403
      self.response.out.write('I need a snapshot code!')
      return

    # Let's start by deleting all previous snapshots and task snapshots.
    allSnapshotsForThisProject = Snapshot.gql("WHERE projectCode = '" + projectCode + "'")
    for snapshotToDelete in allSnapshotsForThisProject:
      allTaskSnapshots = TaskSnapshot.gql("WHERE snapshotCode = '" + snapshotToDelete.code + "'")
      for taskSnapshot in allTaskSnapshots:
        taskSnapshot.delete()
      snapshotToDelete.delete()

    snapshot = Snapshot(date=datetime.datetime.now(), code=code,
        projectCode=project.code)
    snapshot.put()
    subprojects = Subproject.gql("WHERE projectCode = '" + project.code + "'")
    for subproject in subprojects:
      features = Feature.gql("WHERE subprojectCode = '" + subproject.code +
          "'")
      for feature in features:
        tasks = Task.gql("WHERE featureCode = '" + feature.code + "'")
        for task in tasks:
          taskSnapshot = TaskSnapshot(snapshotCode=code, taskCode=task.code,
              originalEstimatedTime=task.originalEstimatedTime,
              currentEstimatedTime=task.currentEstimatedTime,
              actualTime=task.actualTime)
          taskSnapshot.put()
    self.response.out.write('OK')
    # TODO(manucornet): Invalidate cache for burndown charts.

def main():
    application = webapp.WSGIApplication(
          [
            ('/(.*)/snapshot', SnapshotHandler),
          ], debug=True)
    run_wsgi_app(application)

if __name__ == '__main__':
  main()

