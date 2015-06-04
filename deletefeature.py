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
 

import urllib
import webapp2

from models import *
from util import *

class DeleteFeatureHandler(webapp2.RequestHandler):
  def get(self, projectCodeParam):
    projectCode = urllib.unquote(projectCodeParam)
    project = Project.gql("WHERE code = '" + projectCode + "'").get()
    if project == None:
      self.response.headers['Status'] = 403
      self.response.out.write('No project with code ' + projectCode)
      return

    code = self.request.GET.get('code');
    if code == None:
      code = ''
    feature = Feature.gql("WHERE code ='" + code + "'").get()
    if feature == None:
      self.response.headers['Status'] = 403
      self.response.out.write('No feature with code ' + code)
      return

    # TODO(manucornet): Re-add some amount of right management.
    #if Util.getUsernameFromEmail(users.get_current_user().email()) != feature.owner and \
    #  not Util.getUsernameFromEmail(users.get_current_user().email()) in project.admins:
    #  self.response.headers['Status'] = 403
    #  self.response.out.write('Only the owner of a feature can delete it')
    #  return
    feature.delete()

    # Also delete all tasks related to this feature.
    allRelatedTasks = Task.gql("WHERE featureCode = '" + feature.code + "'")
    for t in allRelatedTasks:
      t.delete()


  app = webapp2.WSGIApplication(
          [
            ('/(.*)/deletefeature', DeleteFeatureHandler),
          ], debug=True)
  

