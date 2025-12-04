import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const carrerasService = new CrudService('carreras', 'id_carrera', true);

export default buildCrudRoutes(carrerasService, 'id');
