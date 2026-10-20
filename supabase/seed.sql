
-- DEVELOPMENT ONLY. Not automatically applied to the connected project.
insert into private.rulesets(version,config_json) values('nz.development', '{"name":"NOVA ZENITH","boss":{"id":"abyss_guardian","baseHp":2000},"characters":["WARRIOR","MAGE","THIEF","HEALER"],"developmentOnly":true}')
on conflict(version) do nothing;
insert into private.questions(logical_question_id,revision_number,difficulty,tags,prompt,options_json,correct_option_id,explanation_json,status,content_version) values
 ('dev-easy-1',1,'EASY',array['ARITHMETIC'],'12 + 18 = ?','[{"id":"A","text":"26"},{"id":"B","text":"30"},{"id":"C","text":"32"},{"id":"D","text":"36"}]','B','{"text":"12 + 18 = 30."}','DRAFT','development-v1'),
 ('dev-medium-1',1,'MEDIUM',array['ALGEBRA'],'3x + 7 = 28. x = ?','[{"id":"A","text":"5"},{"id":"B","text":"6"},{"id":"C","text":"7"},{"id":"D","text":"9"}]','C','{"text":"3x = 21, x = 7."}','DRAFT','development-v1'),
 ('dev-hard-1',1,'HARD',array['ALGEBRA'],'f(x)=2x²−3x+1. f(4)=?','[{"id":"A","text":"17"},{"id":"B","text":"21"},{"id":"C","text":"25"},{"id":"D","text":"29"}]','B','{"text":"32−12+1=21."}','DRAFT','development-v1')
on conflict(logical_question_id,revision_number) do nothing;
