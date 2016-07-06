from tethys_sdk.base import TethysAppBase, url_map_maker


class ConstructionDewateringSimulator(TethysAppBase):
    """
    Tethys app class for Construction Dewatering Simulator.
    """

    name = 'Construction Dewatering Simulator'
    index = 'dewater2:home'
    icon = 'dewater2/images/icon.gif'
    package = 'dewater2'
    root_url = 'dewater2'
    color = '#3366ff'
    description = 'Place a brief description of your app here.'
    enable_feedback = False
    feedback_emails = []

        
    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (UrlMap(name='home',
                           url='dewater2',
                           controller='dewater2.controllers.home'),
        )

        return url_maps
