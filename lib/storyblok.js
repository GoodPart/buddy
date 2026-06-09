import { apiPlugin, storyblokInit } from '@storyblok/react/rsc';
import Page from '@/app/_components/storybloks/Page';
import Feature from '@/app/_components/storybloks/Feature';
import Teaser from '@/app/_components/storybloks/Teaser';
import Grid from '@/app/_components/storybloks/Grid';
import Login from '@/app/_components/storybloks/Login';
import Signup from '@/app/_components/storybloks/Signup';
import Product from '@/app/_components/storybloks/Product';
import ProductItem from '@/app/_components/storybloks/ProductItem';
import Banner from '@/app/_components/storybloks/Banner';
import BannerItem from '@/app/_components/storybloks/BannerItem';

export const getStoryblokApi = storyblokInit({
  accessToken: process.env.STORYBLOK_DELIVERY_API_TOKEN,
  use: [apiPlugin],
  components: {
    page: Page,
    feature: Feature,
    teaser: Teaser,
    grid: Grid,
    login: Login,
    signup: Signup,
    product: Product,
    productItem: ProductItem,
    bannerList: Banner,
    bannerItem: BannerItem,
  },
  apiOptions: {
    region: 'eu',
  },
});