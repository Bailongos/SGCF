import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const observacionesService = new CrudService('observaciones', 'id_observacion', true);

export default buildCrudRoutes(observacionesService, 'id');
