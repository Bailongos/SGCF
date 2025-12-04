import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const ciclosService = new CrudService('ciclos_escolares', 'id_ciclo', true);

export default buildCrudRoutes(ciclosService, 'id');
