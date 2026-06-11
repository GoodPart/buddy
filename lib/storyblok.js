import { apiPlugin, storyblokInit } from '@storyblok/react/rsc';
import Page from '@/app/_components/storybloks/Page';
import Feature from '@/app/_components/storybloks/Feature';
import Teaser from '@/app/_components/storybloks/Teaser';
import Grid from '@/app/_components/storybloks/Grid';
import Login from '@/app/_components/storybloks/Login';
import Signup from '@/app/_components/storybloks/Signup';
// import Product from '@/app/_components/storybloks/Product';
// import ProductList from '@/app/_components/storybloks/ProductList';
// import ProductItem from '@/app/_components/storybloks/ProductItem';
// import ProductCard from '@/app/_components/storybloks/ProductCard';
import Banner from '@/app/_components/storybloks/Banner';
import BannerItem from '@/app/_components/storybloks/BannerItem';
import Depth1 from '@/app/_components/storybloks/Depth1';
import LendingBrand from '@/app/_components/storybloks/LendingBrand';
import Header from '@/app/_components/storybloks/Header';
import HeaderLogo from '@/app/_components/storybloks/HeaderLogo';

export const getStoryblokApi = storyblokInit({
  accessToken: process.env.STORYBLOK_DELIVERY_API_TOKEN,
  use: [apiPlugin],
  components: {
    page: Page,
    depth1: Depth1,
    feature: Feature,
    teaser: Teaser,
    grid: Grid,
    login: Login,
    signup: Signup,
    // product: Product,
    // "product-list": ProductList,
    // "product-card": ProductCard,
    // productItem: ProductItem,
    bannerList: Banner,
    bannerItem: BannerItem,
    lendingList: LendingBrand,
    header: Header,
    "nav-logo": HeaderLogo,
  },
  apiOptions: {
    region: 'eu',
  },
});
