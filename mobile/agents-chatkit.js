Lyte.Component.register("agents-chatkit", {
_template:"<template tag-name=\"agents-chatkit\"> <agents-chat-bot-comp ziaagents=\"{{ziaAgents}}\"></agents-chat-bot-comp> </template>\n<style>agents-chatkit {\n    display: contents;\n}</style>",
_dynamicNodes : [{"type":"attr","position":[1]},{"type":"componentDynamic","position":[1]}],
_observedAttributes :["ziaAgents"],
_observedAttributesType :["string"],

	data: function () {
		return {
			ziaAgents: Lyte.attr("string", { default: "" })
		};
	},

	didConnect: function () {
		let raw = this.$node.getAttribute("ziaAgents");
		if (raw && !this.getData("ziaAgents")) {
			this.setData("ziaAgents", raw);
		}
	}
});