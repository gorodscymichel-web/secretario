# Secretário Pessoal - Dashboard de Rotina

## O que é este projeto
Dashboard pessoal do Michel hospedado em Netlify (secretarioclaude.netlify.app).
Mostra duas semanas de planejamento com tracking de treino, dissertação, aulas e trabalho.

## Arquitetura
- `index.html` — interface visual (não editar a menos que pedido)
- `plan.json` — dados da agenda (este é o arquivo que deve ser editado)

## Como atualizar
Quando Michel disser algo como "treinei hoje", "perdi o treino de segunda", "adiciona bloco de dissertação domingo":

1. Edite `plan.json`
2. Altere o `status` do bloco relevante: `planejado`, `feito`, ou `perdido`
3. Para adicionar novos blocos, use id incremental (ex: "x0", "x1")
4. Tipos válidos: `treino`, `dissertacao`, `aula`, `trabalho`
5. Faça commit e push: `git add plan.json && git commit -m "atualiza plano" && git push`

## Regras da rotina do Michel
- Trabalho: 9h-18:30h. Presencial seg/qua/qui. Home office ter/sex.
- Aulas (até fim abril): ter+qua+qui 19:30-22:45
- Treino: só pós-trabalho. NUNCA em dia de aula. HO facilita. FDS manhã viável.
- Dias de treino possíveis: seg (pós ~19h), sex (HO sem aula), FDS manhã.
- Meta treino: 3-4x/semana.
- Dissertação: MDPE FGV EESP, tema crise econômica brasileira anos 2010.

## Para avançar a janela de 2 semanas
Edite `plan.json`: remova a semana passada, adicione nova semana futura seguindo as regras acima.
Atualize o campo `horizon`.
