INSERT INTO question_topics (question_id, topic_id)
SELECT q.id, t.id FROM questions q CROSS JOIN topics t
WHERE t.topic_key = 'aderenza_contatto_delle_ruote_sul_manto_stradale_e_ridotta'
AND q.code IN ('B25180', 'B25181', 'B25183', 'B25190', 'B25191', 'B25192', 'B25193', 'B25194', 'B25196')
ON CONFLICT DO NOTHING;

INSERT INTO question_topics (question_id, topic_id)
SELECT q.id, t.id FROM questions q CROSS JOIN topics t
WHERE t.topic_key = 'con_diritto_di_precedenza_a_sinistra'
AND q.code IN ('B23154')
ON CONFLICT DO NOTHING;

INSERT INTO question_topics (question_id, topic_id)
SELECT q.id, t.id FROM questions q CROSS JOIN topics t
WHERE t.topic_key = 'coperta_di_neve_o_ghiaccio'
AND q.code IN ('B19384', 'B21262', 'B21518', 'B22180', 'B22444', 'B24729', 'B25251', 'B25253', 'B25254')
ON CONFLICT DO NOTHING;

INSERT INTO question_topics (question_id, topic_id)
SELECT q.id, t.id FROM questions q CROSS JOIN topics t
WHERE t.topic_key = 'delineatori_normali_di_margine_per_strade_a_senso_unico'
AND q.code IN ('B21921', 'B21923', 'B21939', 'B21940', 'B21941', 'B21944', 'B21979', 'B21989')
ON CONFLICT DO NOTHING;

INSERT INTO question_topics (question_id, topic_id)
SELECT q.id, t.id FROM questions q CROSS JOIN topics t
WHERE t.topic_key = 'divieto_di_transito_ai'
AND q.code IN ('B20370', 'B21125')
ON CONFLICT DO NOTHING;

INSERT INTO question_topics (question_id, topic_id)
SELECT q.id, t.id FROM questions q CROSS JOIN topics t
WHERE t.topic_key = 'in_caso_di_sorpasso_di_notte_su_strada_a_doppio'
AND q.code IN ('B23580')
ON CONFLICT DO NOTHING;

INSERT INTO question_topics (question_id, topic_id)
SELECT q.id, t.id FROM questions q CROSS JOIN topics t
WHERE t.topic_key = 'simbolo_di_sbrinamento_del_parabrezza'
AND q.code IN ('B25295')
ON CONFLICT DO NOTHING;

INSERT INTO question_topics (question_id, topic_id)
SELECT q.id, t.id FROM questions q CROSS JOIN topics t
WHERE t.topic_key = 'spostamento_del_carico_in_avanti_e'
AND q.code IN ('B24085')
ON CONFLICT DO NOTHING;

INSERT INTO question_topics (question_id, topic_id)
SELECT q.id, t.id FROM questions q CROSS JOIN topics t
WHERE t.topic_key = 'striscia_longitudinale_continua_e_discontinua'
AND q.code IN ('B20709', 'B20710', 'B20711', 'B20712', 'B20713', 'B20714', 'B20715', 'B20716', 'B20717', 'B20718', 'B20724', 'B20771', 'B20772', 'B20773', 'B20774', 'B20775', 'B20776', 'B20777', 'B20778', 'B20779', 'B20889', 'B20890', 'B20905', 'B20906', 'B20907', 'B20908', 'B20909', 'B20910', 'B20933', 'B20934', 'B20936', 'B20937', 'B20938', 'B20939', 'B20940', 'B20941', 'B20943', 'B20944', 'B22831')
ON CONFLICT DO NOTHING;
