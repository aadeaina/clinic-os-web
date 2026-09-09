from rest_framework.test import APITestCase

from .auth_test_utils import auth_header


class AuthenticatedAPITestCase(APITestCase):
    """APITestCase with a valid staff bridge token pre-attached to self.client.

    Every endpoint under test now requires authentication (see
    api.authentication.BridgeTokenAuthentication); subclasses that override setUp
    must call super().setUp() first to keep the credentials attached.
    """

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=auth_header())
