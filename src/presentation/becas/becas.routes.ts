import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const becasService = new CrudService('becas', 'id_beca', true);

export default buildCrudRoutes(becasService, 'id');
