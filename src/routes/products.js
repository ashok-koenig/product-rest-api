import { Router } from 'express';
import * as ctrl from '../controllers/productController.js';
import { validateCreate, validateUpdate, validateFilters } from '../validators/productValidator.js';

const router = Router();

router.get('/', ...validateFilters, ctrl.getProducts);
router.get('/:id', ctrl.getProduct);
router.post('/', ...validateCreate, ctrl.createProduct);
router.patch('/:id', ...validateUpdate, ctrl.updateProduct);
router.delete('/:id/restore', ctrl.restoreProduct);
router.delete('/:id', ctrl.deleteProduct);

export default router;
