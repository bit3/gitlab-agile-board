module View {
    class LoginView {
        private modal:HTMLElement;

        constructor() {
            this.modal = document.createElement('div');

            <form id="login-form" onsubmit="login.call(this); event.preventDefault();">
    <div class="modal fade" id="login-modal">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span
                      aria-hidden="true">&times;</span></button>
            <h4 class="modal-title">Login</h4>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="login-url">gitlab URL</label>
              <input name="url" type="url" class="form-control" id="login-url">
            </div>
            <div class="form-group">
              <label for="login-token">Private token</label>
              <input name="token" type="password" class="form-control" id="login-token">
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-default">Login</button>
          </div>
        </div>
      </div>
    </div>
  </form>
        }
    }
}
