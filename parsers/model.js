

exports.parse = function(data) {


    var compartNameMapping = {
		"c":"Cytosol",
		"p":"Periplasm",
		"g":"Golgi apparatus",
		"e":"Extracellular",
		"r":"Endoplasmic reticulum",
		"l":"Lysosome",
		"n":"Nucleus",
		"d":"Plastid",
		"m":"Mitochondria",
		"x":"Peroxisome",
		"v":"Vacuole",
		"w":"Cell wall",
	};

    this.cpdhash = {};
    this.biohash = {};
    this.rxnhash = {};
    this.cmphash = {};
    this.genehash = {};
    this.gfhash = {};

    // this.modelreactions = data.modelreactions;
    // this.modelcompounds = data.modelcompounds;
    // this.modelcompartments = data.modelcompartments;

    var reactions = [],
        compounds = [],
        modelGenes = [],
        compartments = [],
        biomasses = [],
        gapfilling = [];

    this.biomasses = data.biomasses;
    this.biomasscpds = [];
    this.gapfillings = data.gapfillings;

    // create gapfilling hash
    for (var i=0; i < this.gapfillings.length; i++) {

    	this.gapfillings[i].simpid = "gf."+(i+1);
    	this.gfhash[this.gapfillings[i].simpid] = this.gapfillings[i];
        //gappfillings.push({integrated: })
    }

    for (var i=0; i< data.modelcompartments.length; i++) {
        var cmp = data.modelcompartments[i];
        cmp.cmpkbid = cmp.compartment_ref.split("/").pop();
        cmp.name = compartNameMapping[cmp.cmpkbid];
        this.cmphash[cmp.id] = cmp;

        compartments.push({
                            id: cmp.id,
                            name: cmp.name,
                            pH: cmp.pH,
                            potential: cmp.potential
                         })
    }

    for (var i=0; i< data.modelcompounds.length; i++) {
        var cpd = data.modelcompounds[i];
        //cpd.cmpid = cpd.modelcompartment_ref.split("/").pop();
        cpd.cpdID = cpd.compound_ref.split("/").pop();

        var id = cpd.id, //idarray[0]+"["+idarray[1]+"]",
            compartment = cpd.modelcompartment_ref.split("/").pop(),
            name = cpd.name.replace(/_[a-zA-z]\d+$/, '');

        var obj = {id: id,
                   name: name,
                   formula: cpd.formula,
                   charge: cpd.charge,
                   compartment: compartment}

        cpd.name = name;
        cpd.compartName = compartNameMapping[compartment[0]]+' '+compartment[1];
        cpd.compartment = compartment;
        this.cpdhash[cpd.id] = cpd;
        compounds.push(obj);
    }

    for (var i=0; i < this.biomasses.length; i++) {
    	var biomass = this.biomasses[i];

    	this.biohash[biomass.id] = biomass;
    	biomass.dispid = biomass.id;
    	var reactants = "";
        var products = "";
    	for(var j=0; j < biomass.biomasscompounds.length; j++) {
    		var biocpd = biomass.biomasscompounds[j];
    		biocpd.id = biocpd.modelcompound_ref.split("/").pop();

    		//var idarray = biocpd.id.split('_');
    		biocpd.dispid = biocpd.id//idarray[0]+"["+idarray[1]+"]";

    		biocpd.name = this.cpdhash[biocpd.id].name;
    		biocpd.formula = this.cpdhash[biocpd.id].formula;
    		biocpd.charge = this.cpdhash[biocpd.id].charge;
    		biocpd.cmpkbid = this.cpdhash[biocpd.id].compartment;
    		biocpd.biomass = biomass.id;
    		this.biomasscpds.push(biocpd);
    		if (biocpd.coefficient < 0) {
                if (reactants.length > 0) {
                    reactants += " + ";
                }
                if (biocpd.coefficient != -1) {
                    var abscoef = Math.round(-1*100*biocpd.coefficient)/100;
                    reactants += "("+abscoef+") ";
                }
                reactants += biocpd.name+"["+biocpd.cmpkbid+"]";
            } else {
                if (products.length > 0) {
                    products += " + ";
                }
                if (biocpd.coefficient != 1) {
                    var abscoef = Math.round(100*biocpd.coefficient)/100;
                    products += "("+abscoef+") ";
                }
                products += biocpd.name+"["+biocpd.cmpkbid+"]";
            }

            var compartment = this.cpdhash[biocpd.id].compartment;

            biomasses.push({
                            id: biomass.id,
                            cpdID: biocpd.id,
                            name: biocpd.name,
                            coefficient: biocpd.coefficient,
                            compartment: compartment
                           })
    	}
    	biomass.equation = reactants + " => " + products;
    }

    var gapfills= []
    for (var i=0; i < data.modelreactions.length; i++) {
        var rxn = data.modelreactions[i];

        rxn.gpr = "";

        var reactants = "",
            products = "";

        if (rxn.direction == ">")
            var sign = "=>";
        else if (rxn.direction == "<")
            var sign = "<=";
        else
            var sign = "<=>";

        // huh?
        if (rxn.modelReactionProteins > 0) {
        	rxn.gpr = "";
        }
        for (var j=0; j< rxn.modelReactionReagents.length; j++) {
            var rgt = rxn.modelReactionReagents[j];
            rgt.cpdID = rgt.modelcompound_ref.split("/").pop();

            if (rgt.coefficient < 0) {
                if (reactants.length > 0) {
                    reactants += " + ";
                }
                if (rgt.coefficient != -1) {
                    var abscoef = Math.round(-1*100*rgt.coefficient)/100;

                    reactants += "("+abscoef+") ";
                }
                reactants += this.cpdhash[rgt.cpdID].name+"["+this.cpdhash[rgt.cpdID].compartment+"]";

            } else {
                if (products.length > 0) {
                    products += " + ";
                }
                if (rgt.coefficient != 1) {
                    var abscoef = Math.round(100*rgt.coefficient)/100;
                    products += "("+abscoef+") ";
                }
                products += this.cpdhash[rgt.cpdID].name+"["+this.cpdhash[rgt.cpdID].compartment+"]";
            }
        }
        rxn.ftrhash = {};
        for (var j=0; j< rxn.modelReactionProteins.length; j++) {
            var prot = rxn.modelReactionProteins[j];

            if (j > 0) {
               	rxn.gpr += " or ";
            }
            //rxn.gpr += "(";
            for (var k=0; k< prot.modelReactionProteinSubunits.length; k++) {
                var subunit = prot.modelReactionProteinSubunits[k];
                if (k > 0) {
                	rxn.gpr += " and ";
                }
                rxn.gpr += "(";
                if (subunit.feature_refs.length == 0) {
                	rxn.gpr += "Unknown";
                }
                for (var m=0; m< subunit.feature_refs.length; m++) {
                	var ftrid = subunit.feature_refs[m].split("/").pop();
                    rxn.ftrhash[ftrid] = 1;
                    if (m > 0) {
                		rxn.gpr += " or ";
                	}
                	rxn.gpr += ftrid;
                }
                rxn.gpr += ")";
            }
            //rxn.gpr += ")";
        }

        //rxn.dispfeatures = "";

        // create reaction row for table
        var compartment = rxn.modelcompartment_ref.split("/").pop(),
            id = rxn.id.replace(/_[a-zA-z]\d+$/, '')
            name = rxn.name.replace(/_[a-zA-z]\d+$/, ''),
            eq = reactants+" "+sign+" "+products; //fixme: names have compartments in them

        // get genes and also add to hash for gene table
        rxn.genes = [];
        for (var gene in rxn.ftrhash) {
            rxn.genes.push(gene);

            var foundGenes = [];
            modelGenes.forEach(function(item) {
                foundGenes.push(item.id)
            })

            if (foundGenes.indexOf(gene) == -1)
                modelGenes.push( { id: gene, reactions: [id] } );
            else
                modelGenes[foundGenes.indexOf(gene)].reactions.push(id)
        }

        // add computed data to hash for viewing rxn overview
        rxn.eq = eq;
        rxn.compartment = compartNameMapping[compartment[0]]+' '+compartment[1];
        this.rxnhash[rxn.id] = rxn;

        //  gapfill stuff
        var gfData = rxn.gapfill_data;
        if (!gfData) {
            throw 'Sorry, your model is outdated.  Please reconstruct or download instead.';
        }

        var gapfill = null;
        var added = false,
            reversed = false,
            summary = null;
        if (Object.keys(gfData).length > 0) {
            for (var key in gfData) {
                if (gfData[key].indexOf('added') !== -1)
                    added = true;
                if (gfData[key].indexOf('reversed') !== -1) {
                    reversed = true;
                }
            }

            if (added && reversed) {
                summary = 'added, reversed';
            } else if (added) {
                summary = 'added';
            } else if (reversed) {
                summary = 'reversed';
            }
            gapfill = {solutions: Object.keys(gfData),
                       summary: summary}
        }

        reactions.push({name: name,
                        id: id,
                        compartment: compartment,
                        eq: eq,
                        genes: rxn.genes,
                        gapfill: gapfill || false
                      })
    }

    return {
        reactions: reactions,
        compounds: compounds,
        genes: modelGenes,
        compartments: compartments,
        biomass: biomasses
    };



    /*
    return {cpdhash: this.cpdhash,
            biohash: this.biohash,
            rxnhash: this.rxnhash,
            cmphash: this.cmphash,
            genehash: this.genehash,
            gfhash: this.gfhash,
            parse: this.parse}
    */
}
