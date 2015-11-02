
var modelParser = require('./model.js');

exports.parse = function(data) {

    this.parse = function (fbaObj) {
        self.fba = fbaObj;

        var modelRef = fbaObj.fbamodel_ref.replace(/\|\|/g, '');

        return WS.get(modelRef).then(function(res) {
                    this.modelData = res;
                    this.model = ModelParser;
                    var modelObj =  this.model.parse(res.data);
                    return {rawModel: res.data, fba: fbaData(modelObj) };
                })
    }

    function fbaData (modelObj) {
        var modelreactions = modelObj.reactions;
        var modelcompounds = modelObj.compounds;
        var biomasses = modelObj.biomass;
        var biomasscpds = modelObj.biomasscpds;
        var modelgenes = modelObj.genes;

        var reaction_fluxes = [],
            exchange_fluxes = [],
            genes = [],
            biomass = [];

        var FBAConstraints = self.fba.FBAConstraints;
        var FBAMinimalMediaResults = self.fba.FBAMinimalMediaResults;
        var FBAReactionVariables = self.fba.FBAReactionVariables;
        var FBACompoundVariables = self.fba.FBACompoundVariables;
        var FBAMinimalReactionsResults = self.fba.FBAMinimalReactionsResults;
        var FBAMetaboliteProductionResults = self.fba.FBAMetaboliteProductionResults;
        var FBADeletionResults = self.fba.FBADeletionResults;
        var FBACompoundBounds = self.fba.FBACompoundBounds;
        var FBAReactionBounds = self.fba.FBAReactionBounds;
        this.rxnhash = {};
        for (var i=0; i < FBAReactionVariables.length; i++) {
            var rxn = FBAReactionVariables[i];
            var rxnid = rxn.modelreaction_ref.split("/").pop();
            FBAReactionVariables[i].ko = 0;   // huh?!  leaving this here for now
            this.rxnhash[rxnid] = FBAReactionVariables[i];

            reaction_fluxes.push({name: model.rxnhash[rxnid]? model.rxnhash[rxnid].name : 'not found',
                                 id: rxnid,
                                 ko: rxn.ko,
                                 min: rxn.min,
                                 max: rxn.max,
                                 lower_bound: rxn.lowerBound,
                                 upper_bound: rxn.upperBound,
                                 flux: rxn.value,
                                 class: rxn.class
                                })
        }

        for (var i=0; i < self.fba.reactionKO_refs.length; i++) {
            var rxnid = self.fba.reactionKO_refs[i].split("/").pop();
            this.rxnhash[rxnid].ko = 1;
        }

        this.cpdhash = {};
        for (var i=0; i < FBACompoundVariables.length; i++) {
            var cpd = FBACompoundVariables[i];
            var cpdid = cpd.modelcompound_ref.split("/").pop();
            var modelcpd = model.cpdhash[cpdid];
            cpd.additionalcpd = 0;

            this.cpdhash[cpdid] = cpd;
            exchange_fluxes.push({name: modelcpd ? modelcpd.name : 'not found',
                                 charge: modelcpd ? modelcpd.charge : 'not found',
                                 charge: modelcpd ? modelcpd.formula : 'not found',
                                 id: cpdid,
                                 min: cpd.min,
                                 max: cpd.max,
                                 lower_bound: cpd.lowerBound,
                                 upper_bound: cpd.upperBound,
                                 flux: cpd.value,
                                 class: cpd.class
                                })
        }
        for (var i=0; i < self.fba.additionalCpd_refs.length; i++) {
            var cpdid = self.fba.additionalCpd_refs[i].split("/").pop();
            this.cpdhash[cpdid].additionalcpd = 1;
        }
        this.biohash = {};
        for (var i=0; i < self.fba.FBABiomassVariables.length; i++) {
            var bioid = self.fba.FBABiomassVariables[i].biomass_ref.split("/").pop();
            this.biohash[bioid] = self.fba.FBABiomassVariables[i];
        }
        this.maxpod = 0;
        this.metprodhash = {};
        for (var i=0; i < FBAMetaboliteProductionResults.length; i++) {
            this.tabList[4].columns[5].visible = 1;
            var metprod = FBAMetaboliteProductionResults[i];
            var cpdid = metprod.modelcompound_ref.split("/").pop();
            this.metprodhash[cpdid] = metprod;
        }
        this.genehash = {};
        for (var i=0; i < modelgenes.length; i++) {
            this.genehash[modelgenes[i].id] = modelgenes[i];
            this.genehash[modelgenes[i].id].ko = 0;
        }
        /*
        for (var i=0; i < self.data.geneKO_refs.length; i++) {
            var geneid = self.data.geneKO_refs[i].split("/").pop();
            this.genehash[geneid].ko = 1;
        }*/
        this.delhash = {};
        for (var i=0; i < FBADeletionResults.length; i++) {
            var geneid = FBADeletionResults[i].feature_refs[0].split("/").pop();
            this.delhash[geneid] = FBADeletionResults[i];
        }
        this.cpdboundhash = {};
        for (var i=0; i < FBACompoundBounds.length; i++) {
            var cpdid = FBACompoundBounds[i].modelcompound_ref.split("/").pop();
            this.cpdboundhash[cpdid] = self.fba.FBACompoundBounds[i];
        }
        this.rxnboundhash = {};
        for (var i=0; i < FBAReactionBounds.length; i++) {
            var rxnid = FBAReactionBounds[i].modelreaction_ref.split("/").pop();
            this.rxnboundhash[rxnid] = self.fba.FBAReactionBounds[i];
        }
        for (var i=0; i< modelgenes.length; i++) {
            var mdlgene = modelgenes[i];
            if (this.genehash[mdlgene.id]) {
                mdlgene.ko = this.genehash[mdlgene.id].ko;
            }
            if (this.delhash[mdlgene.id]) {
                mdlgene.growthFraction = this.delhash[mdlgene.id].growthFraction;
            }
        }
        for (var i=0; i< modelreactions.length; i++) {
            var mdlrxn = modelreactions[i];
            if (this.rxnhash[mdlrxn.id]) {
                mdlrxn.upperFluxBound = this.rxnhash[mdlrxn.id].upperBound;
                mdlrxn.lowerFluxBound = this.rxnhash[mdlrxn.id].lowerBound;
                mdlrxn.fluxMin = this.rxnhash[mdlrxn.id].min;
                mdlrxn.fluxMax = this.rxnhash[mdlrxn.id].max;
                mdlrxn.flux = this.rxnhash[mdlrxn.id].value;
                mdlrxn.fluxClass = this.rxnhash[mdlrxn.id].class;
                mdlrxn.disp_low_flux = mdlrxn.fluxMin + "<br>(" + mdlrxn.lowerFluxBound + ")";
                mdlrxn.disp_high_flux = mdlrxn.fluxMax + "<br>(" + mdlrxn.upperFluxBound + ")";
            }
            if (this.rxnboundhash[mdlrxn.id]) {
                mdlrxn.customUpperBound = this.rxnboundhash[mdlrxn.id].upperBound;
                mdlrxn.customLowerBound = this.rxnboundhash[mdlrxn.id].lowerBound;
            }
        }
        this.compoundFluxes = [];
        this.cpdfluxhash = {};
        for (var i=0; i< modelcompounds.length; i++) {
            var mdlcpd = modelcompounds[i];
            if (this.cpdhash[mdlcpd.id]) {
                mdlcpd.exchangerxn = " => "+mdlcpd.name+"[e]";
                mdlcpd.upperFluxBound = this.cpdhash[mdlcpd.id].upperBound;
                mdlcpd.lowerFluxBound = this.cpdhash[mdlcpd.id].lowerBound;
                mdlcpd.fluxMin = this.cpdhash[mdlcpd.id].min;
                mdlcpd.fluxMax = this.cpdhash[mdlcpd.id].max;
                mdlcpd.uptake = this.cpdhash[mdlcpd.id].value;
                mdlcpd.fluxClass = this.cpdhash[mdlcpd.id].class;
                mdlcpd.disp_low_flux = mdlcpd.fluxMin + "<br>(" + mdlcpd.lowerFluxBound + ")";
                mdlcpd.disp_high_flux = mdlcpd.fluxMax + "<br>(" + mdlcpd.upperFluxBound + ")";
                this.cpdfluxhash[mdlcpd.id] = mdlcpd;
                this.compoundFluxes.push(mdlcpd);
            }
            if (this.metprodhash[mdlcpd.id]) {
                mdlcpd.maxProd = this.metprodhash[mdlcpd.id].maximumProduction;
                //if (!this.cpdfluxhash[mdlcpd.id]) {
                //  this.compoundFluxes.push(mdlcpd);
                //}
            }
            if (this.cpdboundhash[mdlcpd.id]) {
                mdlcpd.customUpperBound = this.cpdboundhash[mdlcpd.id].upperBound;
                mdlcpd.customLowerBound = this.cpdboundhash[mdlcpd.id].lowerBound;
                if (!this.cpdfluxhash[mdlcpd.id]) {
                    this.compoundFluxes.push(mdlcpd);
                }
            }
        }
        for (var i=0; i< biomasses.length; i++) {
            var bio = biomasses[i];
            if (this.biohash[bio.id]) {
                bio.upperFluxBound = this.biohash[bio.id].upperBound;
                bio.lowerFluxBound = this.biohash[bio.id].lowerBound;
                bio.fluxMin = this.biohash[bio.id].min;
                bio.fluxMax = this.biohash[bio.id].max;
                bio.flux = this.biohash[bio.id].value;
                bio.fluxClass = this.biohash[bio.id].class;
                modelreactions.push(bio);
            } else {
                this.biohash[bio.id] = bio;
                bio.upperFluxBound = 1000;
                bio.lowerFluxBound = 0;
                bio.fluxMin = 0;
                bio.fluxMax = 1000;
                bio.flux = 0;
                bio.fluxClass = "Blocked";
                modelreactions.push(bio);
            }
            bio.disp_low_flux = bio.fluxMin + "<br>(" + bio.lowerFluxBound + ")";
            bio.disp_high_flux = bio.fluxMax + "<br>(" + bio.upperFluxBound + ")";
        }

        var fbaObj = {reaction_fluxes: reaction_fluxes,
                      exchange_fluxes: exchange_fluxes,
                      genes: genes,
                      biomass: biomass}

        return fbaObj
        /*
        for (var i=0; i < this.biomasscpds.length; i++) {
            var biocpd = this.biomasscpds[i];
            if (this.biohash[biocpd.biomass]) {
                biocpd.bioflux = this.biohash[biocpd.biomass].flux;
            }
            if (this.metprodhash[biocpd.id]) {
                biocpd.maxprod = this.metprodhash[biocpd.id].maximumProduction;
            }
        }*/
    }

    return {parse: this.parse}

}
