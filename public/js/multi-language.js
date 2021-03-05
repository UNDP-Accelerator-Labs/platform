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
	"contributor": {
		"en": plural => { return `contributor${plural ? 's' : ''}` },
		"fr": plural => { return `contributeur${plural ? 's' : ''}` },
		"es": plural => { return `contribuyente${plural ? 's' : ''}` },
		"pt": plural => { return `contribuidor${plural ? 'es' : ''}` }
	},
	"SDG": {
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
	"credit": {
		"en": (cid, name, date) => { return `Contributed by <a href='?mappers=${cid}'>${name}</a> on ${date}.` },
		"fr": (cid, name, date) => { return `Contribué par <a href='?mappers=${cid}'>${name}</a> le ${date}.` },
		"es": (cid, name, date) => { return `Contribuido por <a href='?mappers=${cid}'>${name}</a> el ${date}.` },
		"pt": (cid, name, date) => { return `Contribuíram por <a href='?mappers=${cid}'>${name}</a> em ${date}.` }
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
		"fr": "<strong>Entrée directe</strong> ou <strong>liste de nombres</strong> séparés par des virgules attendue.",
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
		"fr": "<strong>Entrée directe</strong> ou <strong>liste de nombres</strong> séparés par des virgules attendue.",
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
		"fr": "<strong>Entrée directe</strong> ou <strong>texte</strong> attendu.",
		"es": "<strong>Entrada directa</strong> o <strong>texto</strong> esperado.",
		"pt": "<strong>Entrada direta</strong> ou <strong>texto</strong> esperado."
	},
	"location instruction": { // TO DO: FINISH es AND pt
		"en": "Think to include in the instruction that locations need to follow the pattern: village/ town, city, district/ region, and country name (in this order, from smallest administrative unit to largest).",
		"fr": "Penser à mentioner dans l’instruction qu’un emplacement doit être décrit de la manière suivante : village/ ville, département, région et pays (dans cet ordre, de la plus petite entité administrative à la plus large).",
		"es": "Escriba un pueblo/ ciudad, distrito/ región y nombre de país (en este orden).",
		"pt": "Digite uma vila/ cidade, distrito/ região e nome do país (nesta ordem)."
	},
	"request sdgs": {
		"en": "request one or more SDG tag(s)",
		"fr": "demander une ou des étiquette.s ODD.s",
		"es": "solicitar una o más etiqueta(s) de ODS",
		"pt": "solicitar um ou mais etiqueta(s) de ODS"
	},
	"expect sdgs": {
		"en": "<strong>Direct input</strong> or comma-separated <strong>list of numbers</strong> expected.",
		"fr": "<strong>Entrée directe</strong> ou <strong>liste de nombres</strong> séparés par des virgules attendue.",
		"es": "<strong>Entrada directa</strong> o <strong>lista de números</strong> separados por comas esperados.",
		"pt": "<strong>Entrada direta</strong> ou <strong>lista de números</strong> separada por vírgulas esperados."
	},
	"sdgs instruction": {
		"en": "List of possible responses:",
		"fr": "Liste de réponses possibles:",
		"es": "Lista de posibles respuestas:",
		"pt": "Lista de respostas possíveis:"
	},
	"request tags": {
		"en": "request one or more thematic area tag(s)",
		"fr": "demander une ou des étiquette.s thématique.s",
		"es": "solicitar una o más etiqueta(s) de área temática",
		"pt": "solicitar uma ou mais etiqueta(s) de área temática"
	},
	"expect tags": {
		"en": "<strong>Direct input</strong>, comma-separated <strong>list of numbers</strong>, or <strong>text</strong> expected.",
		"fr": "<strong>Entrée directe</strong>, <strong>liste de nombres</strong> séparés par des virgules, oru <strong>texte</strong> attendu.",
		"es": "<strong>Entrada directa</strong>, <strong>lista de números</strong> separados por comas o <strong>texto</strong> esperados.",
		"pt": "<strong>Entrada direta</strong>, <strong>lista de números</strong> separada por vírgulas ou <strong>texto</strong> esperados."
	},
	"tags instruction": {
		"en": "List of possible responses:",
		"fr": "Liste de réponses possibles:",
		"es": "Lista de posibles respuestas:",
		"pt": "Lista de respostas possíveis:"
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
	"click to search or add location": {
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
	"looking for something": {
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
	"item": {
		"en": plural => { return `item${plural ? 's' : ''}` },
		"fr": plural => { return `élément${plural ? 's' : ''}` },
		"es": plural => { return `elemento${plural ? 's' : ''}` },
		"pt": plural => { return `elemento${plural ? 's' : ''}` }
	}
}