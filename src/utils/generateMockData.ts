import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

export const injectTestData = async () => {
  try {
    let { data: clients } = await supabase.from('clients').select('id').limit(1);
    let clientId = clients?.[0]?.id;

    if (!clientId) {
      clientId = uuidv4();
      await supabase.from('clients').insert({ id: clientId, name: 'Cliente Mock', cnpj_cpf: '' });
    }

    const projectsToCreate = [
      { id: uuidv4(), title: 'Projeto Alpha', status: 'Aprovado' },
      { id: uuidv4(), title: 'Projeto Beta', status: 'Pendente' }
    ];

    for (const proj of projectsToCreate) {
      const versionId = uuidv4();

      await supabase.from('projects').insert({
        id: proj.id,
        title: proj.title,
        client_id: clientId,
        status: proj.status
      });

      await supabase.from('project_versions').insert({
        id: versionId,
        project_id: proj.id,
        name: 'V1',
        date: new Date().toISOString(),
        default_tax: 0.1,
        default_margin: 0.2
      });

      const groupNames = ['Pré-Produção', 'Equipe', 'Equipamentos', 'Pós-Produção'];
      
      const groupsToInsert = groupNames.map(name => ({
        id: uuidv4(),
        version_id: versionId,
        name: name,
        is_active: true
      }));

      await supabase.from('cost_groups').insert(groupsToInsert);

      const itemsToInsert: any[] = [];
      groupsToInsert.forEach(group => {
        for (let i = 1; i <= 5; i++) {
          itemsToInsert.push({
            id: uuidv4(),
            group_id: group.id,
            name: `Item Teste ${i} (${group.name})`,
            role: 'Mock Role',
            quantity: Math.floor(Math.random() * 3) + 1,
            days: Math.floor(Math.random() * 5) + 1,
            unit_cost: Math.floor(Math.random() * 1000) + 100,
            tax: 10,
            in_house: Math.random() > 0.5,
            executed_cost: null,
            receipt_link: null
          });
        }
      });

      await supabase.from('cost_items').insert(itemsToInsert);
    }
    console.log("Mock data injected successfully!");
  } catch (error) {
    console.error("Error injecting mock data:", error);
    throw error;
  }
};
