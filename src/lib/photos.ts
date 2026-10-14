import snapshot from '../data/featured-photos.json';
import { featuredPhotosSchema } from './photo-schema';

export { featuredPhotosSchema, photoSchema } from './photo-schema';
export type { FeaturedPhoto, FeaturedPhotos } from './photo-schema';

export const featuredPhotos = featuredPhotosSchema.parse(snapshot);
