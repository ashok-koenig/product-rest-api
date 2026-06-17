import { Router } from 'express';
import * as ctrl from '../controllers/productController.js';

const router = Router();

router.get('/', ctrl.getProducts);
router.get('/:id', ctrl.getProduct);
router.post('/', ctrl.createProduct);
router.patch('/:id', ctrl.updateProduct);
router.delete('/:id', ctrl.deleteProduct);

export default router;
