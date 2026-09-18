'use strict';
'require view';
'require form';
'require rpc';
'require poll';
'require uci';

var callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: [ 'name' ],
	expect: { '': {} },
	reject: true
});

var callHostHints = rpc.declare({
	object: 'luci-rpc',
	method: 'getHostHints',
	expect: { '': {} }
});

function statusText(services, sectionId) {
	if (services == null)
		return _('Unable to query service status');

	var instances = (services.luci_socat || {}).instances || {};
	return instances[sectionId] && instances[sectionId].running
		? _('Running') : _('Not running');
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('socat'),
			callServiceList('luci_socat').catch(function() { return null; }),
			L.resolveDefault(callHostHints(), {})
		]);
	},

	render: function(data) {
		var m, s, o;
		var services = data[1];
		var hints = data[2];

		m = new form.Map('socat', _('Socat'),
			_("Socat is a versatile networking tool named after 'Socket CAT', which can be regarded as an N-fold enhanced version of NetCat"));

		s = m.section(form.NamedSection, 'global', 'global');
		s.addremove = false;
		o = s.option(form.Flag, 'enable', _('Enable'));
		o.rmempty = false;

		s = m.section(form.GridSection, 'config', _('Port Forwards'));
		s.anonymous = true;
		s.addremove = true;
		s.modaltitle = _('Socat Config');
		s.filter = function(sectionId) {
			return uci.get('socat', sectionId, 'protocol') == 'port_forwards';
		};

		o = s.option(form.Flag, 'enable', _('Enable'));
		o.default = '1';
		o.rmempty = false;
		o.editable = true;

		o = s.option(form.DummyValue, '_status', _('Status'));
		o.modalonly = false;
		o.textvalue = function(sectionId) {
			return E('span', { 'data-socat-status': sectionId }, statusText(services, sectionId));
		};

		o = s.option(form.Value, 'remarks', _('Remarks'));
		o.default = _('Remarks');
		o.rmempty = false;

		o = s.option(form.ListValue, 'protocol', _('Protocol'));
		o.value('port_forwards', _('Port Forwards'));
		o.default = 'port_forwards';
		o.rmempty = false;
		o.modalonly = true;

		o = s.option(form.ListValue, 'family', _('Restrict to address family'));
		o.value('', _('IPv4 and IPv6'));
		o.value('4', _('IPv4 only'));
		o.value('6', _('IPv6 only'));

		o = s.option(form.ListValue, 'proto', _('Listen Protocol'));
		o.value('tcp', 'TCP');
		o.value('udp', 'UDP');
		o.default = 'tcp';
		o.rmempty = false;

		o = s.option(form.Value, 'listen_port', _('Listen port'));
		o.datatype = 'portrange';
		o.rmempty = false;

		o = s.option(form.Flag, 'reuseaddr', 'reuseaddr', _('Bind to a port local'));
		o.default = '1';
		o.rmempty = false;
		o.modalonly = true;

		o = s.option(form.ListValue, 'dest_proto', _('Destination Protocol'));
		o.value('tcp4', 'IPv4-TCP');
		o.value('udp4', 'IPv4-UDP');
		o.value('tcp6', 'IPv6-TCP');
		o.value('udp6', 'IPv6-UDP');
		o.default = 'tcp4';
		o.rmempty = false;

		o = s.option(form.Value, 'dest_ip', _('Destination address'));
		o.rmempty = false;
		var addresses = new Set();
		Object.keys(hints).forEach(function(mac) {
			var hint = hints[mac];
			(hint.ipaddrs || []).concat(hint.ip6addrs || []).forEach(function(address) {
				if (!addresses.has(address)) {
					o.value(address, hint.name ? address + ' (' + hint.name + ')' : address);
					addresses.add(address);
				}
			});
		});

		o = s.option(form.Value, 'dest_port', _('Destination port'));
		o.datatype = 'portrange';
		o.rmempty = false;

		o = s.option(form.ListValue, 'proxy', _('Proxy'));
		o.value('', _('None'));
		o.value('socks4/4a', 'Socks4/4a');
		o.value('http', 'HTTP');
		o.depends({ proto: 'tcp', dest_proto: 'tcp4' });
		o.modalonly = true;

		o = s.option(form.Value, 'proxy_server', _('Proxy Server'));
		o.default = '127.0.0.1';
		o.depends('proxy', 'socks4/4a');
		o.depends('proxy', 'http');
		o.modalonly = true;

		o = s.option(form.Value, 'proxy_port', _('Proxy Port'));
		o.datatype = 'port';
		o.default = '1080';
		o.depends('proxy', 'socks4/4a');
		o.depends('proxy', 'http');
		o.modalonly = true;

		o = s.option(form.Flag, 'firewall_accept', _('Open firewall port'));
		o.default = '1';
		o.rmempty = false;
		o.editable = true;

		o = s.option(form.Flag, 'system_log', _('Print message to system log'));
		o.default = '0';
		o.rmempty = false;
		o.modalonly = true;

		return m.render().then(function(node) {
			poll.add(function() {
				return callServiceList('luci_socat').catch(function() {
					return null;
				}).then(function(result) {
					services = result;
					document.querySelectorAll('[data-socat-status]').forEach(function(element) {
						element.textContent = statusText(services, element.getAttribute('data-socat-status'));
					});
				});
			}, 3);
			return node;
		});
	}
});
