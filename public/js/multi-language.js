const vocabulary = {
	"solution": {
		"en": plural => { return `solution${plural ? 's' : ''}` },
		"fr": plural => { return `solution${plural ? 's' : ''}` },
		"es": plural => { return `soluci${plural ? 'ones' : 'ón'}` },
		"pt": plural => { return `soluç${plural ? 'ões' : 'ão'}` }
	},
	"pad": {
		"en": plural => { return `pad${plural ? 's' : ''}` },
		"fr": plural => { return `bloc-note${plural ? 's' : ''}` },
		"es": plural => { return `libreta${plural ? 's' : ''}` },
		"pt": plural => { return plural ? 'Blocos de nota' : 'Bloco de notas' }
	},
	"template": {
		"en": plural => { return `template${plural ? 's' : ''}` },
		"fr": plural => { return `gabarit${plural ? 's' : ''}` },
		"es": plural => { return `plantilla${plural ? 's' : ''}` },
		"pt": plural => { return `modelo${plural ? 's' : ''}` }
	},
	"cohort": {
		"en": plural => { return plural ? "Cohorts" : "Cohort" },
		"fr": plural => { return plural ? "Cohorte" : "Cohorts" },
		"es": plural => { return plural ? "Cohorte" : "Cohortes" },
		"pt": plural => { return plural ? "Coorte" : "Coortes" }
	},
	"mobilization": {
		"en": plural => { return plural ? "Mobilizations" : "Mobilization" },
		"fr": plural => { return plural ? "Mobilisations" : "Mobilisation" },
		"es": plural => { return plural ? "Movilizaciones" : "Movilización" },
		"pt": plural => { return plural ? "Mobilizações" : "Mobilização" }
	},
	"contributor": {
		"en": plural => { return `contributor${plural ? 's' : ''}` },
		"fr": plural => { return `contributeur${plural ? 's' : ''}` },
		"es": plural => { return `contribuyente${plural ? 's' : ''}` },
		"pt": plural => { return `contribuidor${plural ? 'es' : ''}` }
	},
	"sdg": {
		"en": plural => { return plural ? "SDGs": "SDG" },
		"fr": plural => { return plural ? "ODD": "ODD" },
		"es": plural => { return plural ? "ODS": "ODS" },
		"pt": plural => { return plural ? "ODS": "ODS" }
	},
	"thematic area": {
		"en": plural => { return `thematic area${plural ? 's' : ''}` },
		"fr": plural => { return `thématique${plural ? 's' : ''}` },
		"es": plural => { return `tema${plural ? 's' : ''}` },
		"pt": plural => { return `tema${plural ? 's' : ''}` }
	},
	"credit": { // THIS DIFFERS SLIGHTLY FROM multi-language.ejs
		"en": (cid, name, lab, date) => { return `Contributed by <a href='?mappers=${cid}'>${name}</a> (${lab}) on ${this.date(date, 'en')}.` },
		"fr": (cid, name, lab, date) => { return `Contribué par <a href='?mappers=${cid}'>${name}</a> (${lab}) le ${this.date(date, 'fr')}.` },
		"es": (cid, name, lab, date) => { return `Contribuido por <a href='?mappers=${cid}'>${name}</a> (${lab}) el ${this.date(date, 'es')}.` },
		"pt": (cid, name, lab, date) => { return `Contribuíram por <a href='?mappers=${cid}'>${name}</a> (${lab}) em ${this.date(date, 'pt')}.` }
	},
	"untitled pad": {
		"en": "Untitled pad",
		"fr": "Bloc-note sans titre",
		"es": "Libreta sin título",
		"pt": "Bloco de notas sem título",
	},
	"untitled template": {
		"en": "Untitled template",
		"fr": "Gabarit sans titre",
		"es": "Plantilla sin título",
		"pt": "Modelo sem título"
	},
	"publish all": {
		"en": "Publish all",
		"fr": "Tout publier",
		"es": "Publicar todo",
		"pt": "Publicar tudo"
	},
	"pad publication status": {
		"en": (count, status) => {
			const plural = count !== 1
			if (status === 0) return `${count} ${plural ? '<u>unfinished</u> pads' : '<u>unfinished</u> pad'}`
			if (status === 1) return `${count} ${plural ? '<u>publishable</u> pads' : '<u>publishable</u> pad'}`
			if (status === 2) return `${count} ${plural ? '<u>published</u> pads' : '<u>published</u> pad'}`
		},
		"fr": (count, status) => {
			const plural = count !== 1
			if (status === 0) return `${count} ${plural ? 'bloc-notes <u>non finis</u>' : 'bloc-note <u>non fini</u>'}`
			if (status === 1) return `${count} ${plural ? 'bloc-notes <u>publiables</u>' : 'bloc-note <u>publiable</u>'}`
			if (status === 2) return `${count} ${plural ? 'bloc-notes <u>publiés</u>' : 'bloc-note <u>publié</u>'}`
		},
		"es": (count, status) => {
			const plural = count !== 1
			if (status === 0) return `${count} ${plural ? 'libretas <u>sin terminar</u>' : 'libreta <u>sin terminar</u>'}`
			if (status === 1) return `${count} ${plural ? 'libretas <u>publicables</u>' : 'libreta <u>publicable</u>'}`
			if (status === 2) return `${count} ${plural ? 'libretas <u>publicadas</u>' : 'libreta <u>publicada</u>'}`
		},
		"pt": (count, status) => {
			const plural = count !== 1
			if (status === 0) return `${count} ${plural ? 'blocos de notas <u>inacabados</u>' : 'bloco de notas <u>inacabado</u>'}`
			if (status === 1) return `${count} ${plural ? 'blocos de notas <u>publicáveis</u>' : 'bloco de notas <u>publicável</u>'}`
			if (status === 2) return `${count} ${plural ? 'blocos de notas <u>publicados</u>' : 'bloco de notas <u>publicados</u>'}`
		}
	},
	"template publication status": {
		"en": (count, status) => {
			const plural = count !== 1
			if (status === 0) return `${count} ${plural ? '<u>unfinished</u> templates' : '<u>unfinished</u> template'}`
			if (status === 1) return `${count} ${plural ? '<u>publishable</u> templates' : '<u>publishable</u> template'}`
			if (status === 2) return `${count} ${plural ? '<u>published</u> templates' : '<u>published</u> template'}`
		},
		"fr": (count, status) => {
			const plural = count !== 1
			if (status === 0) return `${count} ${plural ? 'gabarits <u>non finis</u>' : 'gabarit <u>non fini</u>'}`
			if (status === 1) return `${count} ${plural ? 'gabarits <u>publiables</u>' : 'gabarit <u>publiable</u>'}`
			if (status === 2) return `${count} ${plural ? 'gabarits <u>publiés</u>' : 'gabarit <u>publié</u>'}`
		},
		"es": (count, status) => {
			const plural = count !== 1
			if (status === 0) return `${count} ${plural ? 'plantillas <u>sin terminar</u>' : 'plantilla <u>sin terminar</u>'}`
			if (status === 1) return `${count} ${plural ? 'plantillas <u>publicables</u>' : 'plantilla <u>publicable</u>'}`
			if (status === 2) return `${count} ${plural ? 'plantillas <u>publicadas</u>' : 'plantilla <u>publicada</u>'}`
		},
		"pt": (count, status) => {
			const plural = count !== 1
			if (status === 0) return `${count} ${plural ? 'modelos <u>inacabados</u>' : 'modelo <u>inacabado</u>'}`
			if (status === 1) return `${count} ${plural ? 'modelos <u>publicáveis</u>' : 'modelo <u>publicável</u>'}`
			if (status === 2) return `${count} ${plural ? 'modelos <u>publicados</u>' : 'modelo <u>publicados</u>'}`
		}
	},
	"cohort status": {
		"en": (count, status) => {
			const plural = count !== 1
			if (status === 1) return `${count} ${plural ? '<u>active</u> cohorts' : '<u>active</u> cohort'}`
			if (status === 2) return `${count} ${plural ? '<u>past</u> cohorts' : '<u>past</u> cohort'}`
		},
		"fr": (count, status) => {
			const plural = count !== 1
			if (status === 1) return `${count} ${plural ? 'cohortes <u>actives</u>' : 'cohorte <u>active</u>'}`
			if (status === 2) return `${count} ${plural ? 'cohortes <u>passées</u>' : 'cohorte <u>passée</u>'}`
		},
		"es": (count, status) => {
			const plural = count !== 1
			if (status === 1) return `${count} ${plural ? 'cohortes <u>activas</u>' : 'cohorte <u>activa</u>'}`
			if (status === 2) return `${count} ${plural ? 'cohortes <u>pasadas</u>' : 'cohorte <u>pasada</u>'}`
		},
		"pt": (count, status) => {
			const plural = count !== 1
			if (status === 1) return `${count} ${plural ? 'coortes <u>ativas</u>' : 'coorte <u>ativa</u>'}`
			if (status === 2) return `${count} ${plural ? 'coortes <u>anteriores</u>' : 'modelo <u>anterior</u>'}`
		}
	},
	"download": {
		"en": "Download",
		"fr": "Télécharger",
		"es": "Descargar",
		"pt": "Download"
	},
	"download all": {
		"en": "Download all",
		"fr": "Tout télécharger",
		"es": "Descarga todo",
		"pt": "Download tudo"
	},
	"description": {
		"en": 'Description',
		"fr": 'Description',
		"es": 'Descripción',
		"pt": 'Descrição'
	},
	"media": {
		"en": 'Media',
		"fr": 'Média',
		"es": 'Medios',
		"pt": 'Meios'
	},
	"metadata": {
		"en": "Metadata",
		"fr": "Métadonnées",
		"es": "Metadatos",
		"pt": "Metadatos"
	},
	"missing template description": {
		"en": "Missing description of the temaplate.",
		"fr": "Description du gabarit manquante.",
		"es": "Descripción vacía de la plantilla",
		"pt": "Falta descrição do modelo"
	},
	"empty txt": {
		"en": "empty text field",
		"fr": "champ de texte vide",
		"es": "campo de texto vacío",
		"pt": "campo de texto vazio"
	},
	"empty embed": {
		"en": "empty embedding field",
		"fr": "champ d’intégration vide",
		"es": "campo de incrustación vacío",
		"pt": "campo de incorporação vazio"
	},
	"missing image": {
		"en": "Missing image.",
		"fr": "Image manquante.",
		"es": "Falta una imagen.",
		"pt": "Faltando uma imagem."
	},
	"new checklist item": {
		"en": "Add an item to the checklist",
		"fr": "Ajouter un élément à la liste",
		"es": "Agregar un elemento a la lista",
		"pt": "Adicione um item à lista"
	},
	"missing SDG": {
		"en": "missing SDG(s)",
		"fr": "ODD manquant.s",
		"es": "ODS faltante(s)",
		"pt": "faltando ODS"
	},
	"missing tag": {
		"en": "missing tag(s)",
		"fr": "mot.s clé.s manquant",
		"es": "etiqueta(s) faltante(s)",
		"pt": "etiqueta(s) faltando"
	},
	"missing external_resource": {
		"en": "missing resource(s)",
		"fr": "ressource.s manquante.s",
		"es": "rescurso(s) faltante(s)",
		"pt": "recurso(s) ausente(s)"
	},
	"request group": {
		"en": "describe group",
		"fr": "décrire le groupe",
		"es": "describir grupo",
		"pt": "descrever o grupo"
	},
	"expect group": {
		"en": "<strong>Text</strong> expected.",
		"fr": "<strong>Texte</strong> attendu.",
		"es": "<strong>Texto</strong> esperado.",
		"pt": "<strong>Texto</strong> esperado."
	},
	"request title": {
		"en": "request a title",
		"fr": "demander un titre",
		"es": "solicitar un título",
		"pt": "solicite um título"
	},
	"expect title": {
		"en": "<strong>Text</strong> expected.",
		"fr": "<strong>Texte</strong> attendu.",
		"es": "<strong>Texto</strong> esperado.",
		"pt": "<strong>Texto</strong> esperado."
	},
	"expect lead": {
		"en": "<strong>Text</strong> expected.",
		"fr": "<strong>Texte</strong> attendu.",
		"es": "<strong>Texto</strong> esperado.",
		"pt": "<strong>Texto</strong> esperado."
	},
	"request img": {
		"en": "request one or several images",
		"fr": "demander une ou plusieurs images",
		"es": "solicitar una o varias imágenes",
		"pt": "solicite uma ou várias imagens"
	},
	"expect img": {
		"en": "<i class='material-icons'>photo</i><br><strong>Image(s)</strong> expected.",
		"fr": "<i class='material-icons'>photo</i><br><strong>Image.s</strong> attendue.s.",
		"es": "<i class='material-icons'>photo</i><br><strong>Imagen(es)</strong> esperada(s).",
		"pt": "<i class='material-icons'>photo</i><br><strong>Image.m.ns</strong> esperada.s."
	},
	"request drawing": {
		"en": "request a drawing",
		"fr": "demander un dessin",
		"es": "solicitar un dibujo",
		"pt": "solicitar um desenho"
	},
	"expect drawing": {
		"en": "<strong>Drawing</strong> expected.",
		"fr": "<strong>Dessin</strong> attendu.",
		"es": "<strong>Dibujo</strong> esperado.",
		"pt": "<strong>Desenho</strong> esperado."
	},
	"request txt": {
		"en": "request a description",
		"fr": "demander une description",
		"es": "solicitar una descripción",
		"pt": "solicite uma descrição"
	},
	"expect txt": {
		"en": "<strong>Text</strong> expected.",
		"fr": "<strong>Texte</strong> attendu.",
		"es": "<strong>Texto</strong> esperado.",
		"pt": "<strong>Texto</strong> esperado."
	},
	"request embed": {
		"en": "request a link or embedded HMTL code",
		"fr": "demander un lien ou du code HMTL intégré",
		"es": "solicitar un enlace o código HMTL incrustado",
		"pt": "solicitar um link ou código HMTL incorporado"
	},
	"expect embed": {
		"en": "<strong>URL</strong> or <strong>HTML code</strong> expected.",
		"fr": "<strong>URL</strong> ou <strong>code HTML</strong> attendu.",
		"es": "<strong>URL</strong> o <strong>código HTML</strong> esperado.",
		"pt": "<strong>URL</strong> ou <strong>código HTML</strong> esperado."
	},
	"request checklist": {
		"en": "request a response from multiple choices",
		"fr": "demander une réponse parmi plusieurs choix",
		"es": "solicitar una respuesta de múltiples opciones",
		"pt": "solicitar uma resposta de várias escolhas"
	},
	"expect checklist": {
		"en": "<strong>Direct input</strong> or comma-separated <strong>list of numbers</strong> expected.",
		"fr": "<strong>Saisie directe</strong> ou <strong>liste de nombres</strong> séparés par des virgules attendue.",
		"es": "<strong>Entrada directa</strong> o <strong>lista de números</strong> separados por comas esperados.",
		"pt": "<strong>Entrada direta</strong> ou <strong>lista de números</strong> separada por vírgulas esperados."
	},
	"request radiolist": {
		"en": "request a unique response from multiple choices",
		"fr": "demander une réponse unique parmi plusieurs choix",
		"es": "solicitar una única respuesta entre varias opciones",
		"pt": "poproś o jedną odpowiedź spośród kilku opcji"
	},
	"expect radiolist": {
		"en": "<strong>Direct input</strong> or comma-separated <strong>list of numbers</strong> expected.",
		"fr": "<strong>Saisie directe</strong> ou <strong>liste de nombres</strong> séparés par des virgules attendue.",
		"es": "<strong>Entrada directa</strong> o <strong>lista de números</strong> separados por comas esperados.",
		"pt": "<strong>Entrada direta</strong> ou <strong>lista de números</strong> separada por vírgulas esperados."
	},
	"request location": {
		"en": "request a location",
		"fr": "demander un emplacement",
		"es": "solicitar una ubicación",
		"pt": "solicite uma localização"
	},
	"expect location": {
		"en": "<strong>Direct input</strong> or <strong>text</strong> expected.",
		"fr": "<strong>Saisie directe</strong> ou <strong>texte</strong> attendu.",
		"es": "<strong>Entrada directa</strong> o <strong>texto</strong> esperado.",
		"pt": "<strong>Entrada direta</strong> ou <strong>texto</strong> esperado."
	},
	"location instruction": { // TO DO: FINISH es AND pt
		"en": "Think to include in the instruction that locations need to follow the pattern: village/ town, city, district/ region, and country name (in this order, from smallest administrative unit to largest).",
		"fr": "Penser à mentioner dans l’instruction qu’un emplacement doit être décrit de la manière suivante : village/ ville, département, région et pays (dans cet ordre, de la plus petite entité administrative à la plus large).",
		"es": "Escriba un pueblo/ ciudad, distrito/ región y nombre de país (en este orden).",
		"pt": "Digite uma vila/ cidade, distrito/ região e nome do país (nesta ordem)."
	},
	"request index": {
		"en": "request one or more SDG tags",
		"fr": "demander une ou plusieurs étiquettes ODDs",
		"es": "solicitar una o más etiquetas de ODS",
		"pt": "solicitar um ou mais etiquetas de ODS"
	},
	"expect index": {
		"en": "<strong>Direct input</strong> or comma-separated <strong>list of numbers</strong> expected.",
		"fr": "<strong>Saisie directe</strong> ou <strong>liste de nombres</strong> séparés par des virgules attendue.",
		"es": "<strong>Entrada directa</strong> o <strong>lista de números</strong> separados por comas esperados.",
		"pt": "<strong>Entrada direta</strong> ou <strong>lista de números</strong> separada por vírgulas esperados."
	},
	"index instruction": {
		"en": "List of possible responses:",
		"fr": "Liste de réponses possibles:",
		"es": "Lista de posibles respuestas:",
		"pt": "Lista de respostas possíveis:"
	},
	"request tag": {
		"en": "request one or more thematic area tags",
		"fr": "demander une ou plusieurs étiquettes thématiques",
		"es": "solicitar una o más etiquetas de área temática",
		"pt": "solicitar uma ou mais etiquetas de área temática"
	},
	"expect tag": {
		"en": "<strong>Direct input</strong>, comma-separated <strong>list of numbers</strong>, or <strong>text</strong> expected.",
		"fr": "<strong>Saisie directe</strong>, <strong>liste de nombres</strong> séparés par des virgules, ou <strong>texte</strong> attendu.",
		"es": "<strong>Entrada directa</strong>, <strong>lista de números</strong> separados por comas o <strong>texto</strong> esperados.",
		"pt": "<strong>Entrada direta</strong>, <strong>lista de números</strong> separada por vírgulas ou <strong>texto</strong> esperados."
	},
	"tag instruction": {
		"en": "List of possible responses:",
		"fr": "Liste de réponses possibles:",
		"es": "Lista de posibles respuestas:",
		"pt": "Lista de respostas possíveis:"
	},

	"request external_resource": {
		"en": "request one or more external resources",
		"fr": "demander une ou plusieurs ressources externes",
		"es": "solicitar una o más recursos",
		"pt": "solicitar uma ou mais recursos"
	},
	"expect external_resource": {
		"en": "<img src='/imgs/icons/i-generic-external-resource-btn.svg'><strong>Direct input</strong> or <strong>text</strong> expected.",
		"fr": "<img src='/imgs/icons/i-generic-external-resource-btn.svg'><strong>Saisie directe</strong> ou <strong>texte</strong> attendu.",
		"es": "<img src='/imgs/icons/i-generic-external-resource-btn.svg'><strong>Entrada directa</strong> o <strong>texto</strong> esperados.",
		"pt": "<img src='/imgs/icons/i-generic-external-resource-btn.svg'><strong>Entrada direta</strong> ou <strong>texto</strong> esperados."
	},
	// "external_resource instruction": {
	// 	"en": "List of possible responses:",
	// 	"fr": "Liste de réponses possibles:",
	// 	"es": "Lista de posibles respuestas:",
	// 	"pt": "Lista de respostas possíveis:"
	// },

	// "request skills": {
	// 	"en": "request one or more skill tag(s)",
	// 	"fr": "demander une ou des étiquette.s de compétence.s",
	// 	"es": "solicitar una o más etiqueta(s) de habilidades",
	// 	"pt": "solicitar uma ou mais etiqueta(s) de habilidades"
	// },
	// "expect skills": {
	// 	"en": "<strong>Direct input</strong>, comma-separated <strong>list of numbers</strong>, or <strong>text</strong> expected.",
	// 	"fr": "<strong>Saisie directe</strong>, <strong>liste de nombres</strong> séparés par des virgules, ou <strong>texte</strong> attendu.",
	// 	"es": "<strong>Entrada directa</strong>, <strong>lista de números</strong> separados por comas o <strong>texto</strong> esperados.",
	// 	"pt": "<strong>Entrada direta</strong>, <strong>lista de números</strong> separada por vírgulas ou <strong>texto</strong> esperados."
	// },
	// "skills instruction": {
	// 	"en": "List of possible responses:",
	// 	"fr": "Liste de réponses possibles:",
	// 	"es": "Lista de posibles respuestas:",
	// 	"pt": "Lista de respostas possíveis:"
	// },
	// "request methods": {
	// 	"en": "request one or more method tag(s)",
	// 	"fr": "demander une ou des étiquette.s méthodologique.s",
	// 	"es": "solicitar una o más etiqueta(s) de método",
	// 	"pt": "solicitar uma ou mais etiqueta(s) de método"
	// },
	// "expect methods": {
	// 	"en": "<strong>Direct input</strong>, comma-separated <strong>list of numbers</strong>, or <strong>text</strong> expected.",
	// 	"fr": "<strong>Saisie directe</strong>, <strong>liste de nombres</strong> séparés par des virgules, ou <strong>texte</strong> attendu.",
	// 	"es": "<strong>Entrada directa</strong>, <strong>lista de números</strong> separados por comas o <strong>texto</strong> esperados.",
	// 	"pt": "<strong>Entrada direta</strong>, <strong>lista de números</strong> separada por vírgulas ou <strong>texto</strong> esperados."
	// },
	// "methods instruction": {
	// 	"en": "List of possible responses:",
	// 	"fr": "Liste de réponses possibles:",
	// 	"es": "Lista de posibles respuestas:",
	// 	"pt": "Lista de respostas possíveis:"
	// },
	// "request datasources": {
	// 	"en": "request one or more data source(s)",
	// 	"fr": "demander une ou des source.s de données",
	// 	"es": "solicitar una o más fuente(s) de datos",
	// 	"pt": "solicitar uma ou mais fonte(s) de dados"
	// },
	// "expect datasources": {
	// 	"en": "<strong>Direct input</strong>, comma-separated <strong>list of numbers</strong>, or <strong>text</strong> expected.",
	// 	"fr": "<strong>Saisie directe</strong>, <strong>liste de nombres</strong> séparés par des virgules, ou <strong>texte</strong> attendu.",
	// 	"es": "<strong>Entrada directa</strong>, <strong>lista de números</strong> separados por comas o <strong>texto</strong> esperados.",
	// 	"pt": "<strong>Entrada direta</strong>, <strong>lista de números</strong> separada por vírgulas ou <strong>texto</strong> esperados."
	// },
	// "datasources instruction": { // TO DO: HOMOGENIZE THIS AS IT IS THE SAME FOR ALL META LISTS
	// 	"en": "List of possible responses:",
	// 	"fr": "Liste de réponses possibles:",
	// 	"es": "Lista de posibles respuestas:",
	// 	"pt": "Lista de respostas possíveis:"
	// },
	"expect repeat": {
		"en": "<strong>Direct input</strong> expected.",
		"fr": "<strong>Saisie directe</strong> attendu.",
		"es": "<strong>Entrada directa</strong> esperada.",
		"pt": "<strong>Entrada direta</strong> esperada."
	},
	"search place": {
		"en": "Looking for a place?",
		"fr": "À la recherche d’un emplacement ?",
		"es": "Buscando una ubicación?",
		"pt": "Procurando um local?"
	},
	"remove pin": {
		"en": "Remove pin",
		"fr": "Supprimer l’emplacement",
		"es": "Eliminar ubicación",
		"pt": "Deletar localização"
	},
	"click to search or add locations": {
		"en": "Click to search and add locations",
		"fr": "Cliquer pour chercher et ajouter des emplacements",
		"es": "Haga clic para buscar y agregar ubicaciones",
		"pt": "Clique para pesquisar e adicionar locais"
	},
	"click to see options": {
		"en": "Click to see options",
		"fr": "Cliquer pour voir les options",
		"es": "Haga clic para ver opciones",
		"pt": "Clique para ver as opçōes"
	},
	"write instruction": {
		"en": "Write an instruction",
		"fr": "Donner une instruction",
		"es": "Escribe una instrucción",
		"pt": "Escreva uma instrução"
	},
	"looking for something": { // THIS IS search IN multi-language.ejs
		"en": "Looking for something?",
		"fr": "À la recherche de quleque chose ?",
		"es": "¿Busca algo?",
		"pt": "Procurando por algo?"
	},
	"looking for something or add": { // ADD THIS IN AN ADAPTED VERSION OF search IN multi-language.ejs
		"en": "Looking for something or want to add it?",
		"fr": "À la recherche de quleque chose ou besoin de l’ajouter ?",
		"es": "¿Busca algo o necesita agregarlo?",
		"pt": "Procurando algo ou precisa adicioná-lo?"
	},
	"add someone": {
		"en": "Want to add someone?",
		"fr": "Ajouter quelqu’un ?",
		"es": "¿Agregar a alguien?",
		"pt": "Adicionar alguém?"
	},
	"save": {
		"en": "Save",
		"fr": "Enregistrer",
		"es": "Salvar",
		"pt": "Salve"
	},
	"save changes": {
		"en": "Save changes",
		"fr": "Enregistrer les modifications",
		"es": "Guardar cambios",
		"pt": "Salvar mudanças"
	},
	"changes saved": {
		"en": "Changes saved",
		"fr": "Modifications enregistrées",
		"es": "Cambios guardados",
		"pt": "Alterações salvas"
	},
	"bookmark": {
		"en": active => { return active ? "Bookmarked" : "Bookmark" },
		"fr": active => { return active ? "Favori" : "Marquer" },
		"es": active => { return active ? "Favorito" : "Marcador" },
		"pt": active => { return active ? "Favorito" : "Marcar" }
	},
	"item": { // THIS IS NOT QUITE THE SAME AS IN multi-language.ejs
		"en": plural => { return `Item${plural ? 's' : ''}` },
		"fr": plural => { return `Élément${plural ? 's' : ''}` },
		"es": plural => { return `Elemento${plural ? 's' : ''}` },
		"pt": plural => { return `Elemento${plural ? 's' : ''}` }
	},
	"status": {
		"en": (object, status, count) => {
			// const plural = count !== 1
			// if (object === 'pads') {
			//	if (status === 0) return `Unfinished ${plural ? 'pads' : 'pad'}`
			//	if (status === 1) return `Publishable ${plural ? 'pads' : 'pad'}`
			//	if (status === 2) return `Shared ${plural ? 'pads' : 'pad'}`
			//	if (status === 2) return `Published ${plural ? 'pads' : 'pad'}`
			// }
			if (status === 0) return `Unfinished`
			if (status === 1) return `Publishable`
			if (status === 2) return `Published`
		},
		"fr": (object, status, count) => {
			// const plural = count !== 1
			// if (object === 'pads') {
			// 	if (status === 0) return `${plural ? 'Bloc-notes non finis' : 'Bloc-note non fini'}`
			// 	if (status === 1) return `${plural ? 'Bloc-notes publiables' : 'Bloc-note publiable'}`
			// 	if (status === 2) return `${plural ? 'Bloc-notes partagés' : 'Bloc-note partagé'}`
			// 	if (status === 2) return `${plural ? 'Bloc-notes publiés' : 'Bloc-note publié'}`
			// }
			if (status === 0) return 'Non finis'
			if (status === 1) return 'Publiables'
			if (status === 2) return 'Publiés'
		},
		"es": (object, status, count) => {
			// const plural = count !== 1
			// if (object === 'pads') {
			// 	if (status === 0) return `${plural ? 'Libretas sin terminar' : 'Libreta sin terminar'}`
			// 	if (status === 1) return `${plural ? 'Libretas publicables' : 'Libreta publicable'}`
			// 	// if (status === 2) return `${plural ? 'Libretas compartidas' : 'Libreta compartida'}`
			// 	if (status === 2) return `${plural ? 'Libretas publicadas' : 'Libreta publicada'}`
			// }
			if (status === 0) return 'Sin terminar'
			if (status === 1) return 'Publicables'
			if (status === 2) return 'Publicadas'
		},
		"pt": (object, status, count) => {
			// const plural = count !== 1
			// if (object === 'pads') {
			// 	if (status === 0) return `${plural ? 'Blocos de notas inacabados' : 'Bloco de notas inacabado'}`
			// 	if (status === 1) return `${plural ? 'Blocos de notas publicáveis' : 'Bloco de notas publicável'}`
			// 	if (status === 2) return `${plural ? 'Blocos de notas compartilhados' : 'Bloco de notas compartilhado'}`
			// 	if (status === 2) return `${plural ? 'Blocos de notas publicados' : 'Bloco de notas publicados'}`
			// }
			if (status === 0) return 'Inacabados'
			if (status === 1) return 'Publicáveis'
			if (status === 2) return 'Publicados'
		}
	},
	"date": function (date, language) {
		// USEFUL TABLE: https://web.library.yale.edu/cataloging/months
		const matches = date.match(/\d+/g)
		if (language === 'en') {
			if (matches.length === 1) {
				const num = parseInt(matches[0])
				if (date.includes('minutes ago')) return `${num} minute${num === 1 ? '' : 's'} ago`
				if (date.includes('hours ago')) return `${num} hour${num === 1 ? '' : 's'} ago`
				if (date.includes('days ago')) return `${num} day${num === 1 ? '' : 's'} ago`
			} else return date
		}
		if (language === 'fr') {
			if (matches.length === 1) {
				const num = parseInt(matches[0])
				if (date.includes('minutes ago')) return `il y a ${num} minute${num === 1 ? '' : 's'}`
				if (date.includes('hours ago')) return `il y a ${num} heure${num === 1 ? '' : 's'}`
				if (date.includes('days ago')) return `il y a ${num} jour${num === 1 ? '' : 's'}`
			} else return date.replace(/Jan/i, 'janv.')
				.replace(/Feb/i, 'févr.')
				.replace(/Mar/i, 'mars')
				.replace(/Apr/i, 'avr.')
				.replace(/May/i, 'mai')
				.replace(/Jun/i, 'juin')
				.replace(/Jul/i, 'juill.')
				.replace(/Aug/i, 'août')
				.replace(/Sep/i, 'sept.')
				.replace(/Oct/i, 'oct.')
				.replace(/Nov/i, 'nov.')
				.replace(/Dec/i, 'déc.')
		}
		if (language === 'es') {
			if (matches.length === 1) {
				const num = parseInt(matches[0])
				if (date.includes('minutes ago')) return `hace ${num} minuto${num === 1 ? '' : 's'}`
				if (date.includes('hours ago')) return `hace ${num} hora${num === 1 ? '' : 's'}`
				if (date.includes('days ago')) return `hace ${num} día${num === 1 ? '' : 's'}`
			} else return date.replace(/Jan/i, 'enero')
				.replace(/Feb/i, 'feb')
				.replace(/Mar/i, 'mar')
				.replace(/Apr/i, 'abr')
				.replace(/May/i, 'mayo')
				.replace(/Jun/i, 'jun')
				.replace(/Jul/i, 'jul')
				.replace(/Aug/i, 'agosto')
				.replace(/Sep/i, 'sept')
				.replace(/Oct/i, 'oct')
				.replace(/Nov/i, 'nov')
				.replace(/Dec/i, 'dic')
		}
		if (language === 'pt') {
			if (matches.length === 1) {
				const num = parseInt(matches[0])
				if (date.includes('minutes ago')) return `${num} minuto${num === 1 ? '' : 's'} atrás`
				if (date.includes('hours ago')) return `${num} hora${num === 1 ? '' : 's'} atrás`
				if (date.includes('days ago')) return `${num} dia${num === 1 ? '' : 's'} atrás`
			} else return date.replace(/Jan/i, 'jan.')
				.replace(/Feb/i, 'fev.')
				.replace(/Mar/i, 'março')
				.replace(/Apr/i, 'abril')
				.replace(/May/i, 'maio')
				.replace(/Jun/i, 'junho')
				.replace(/Jul/i, 'julho')
				.replace(/Aug/i, 'agosto')
				.replace(/Sep/i, 'set.')
				.replace(/Oct/i, 'out.')
				.replace(/Nov/i, 'nov.')
				.replace(/Dec/i, 'dez.')
		}
	}  
}